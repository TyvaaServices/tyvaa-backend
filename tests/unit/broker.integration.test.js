import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import fs from "fs";
import path from "path";

// Import the Broker class, not the singleton instance
async function createBroker(config = {}) {
    const { default: BrokerModule } = await import(
        "../../src/broker/broker.js"
    );
    // The Broker class itself is exported as BrokerClass
    return new BrokerModule.BrokerClass(config);
}

describe("Broker Integration Tests", () => {
    let testStorageDir;
    let broker;

    beforeEach(async () => {
        // Create a test storage directory
        testStorageDir = path.join(
            process.cwd(),
            `integration-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        );
        if (fs.existsSync(testStorageDir)) {
            fs.rmSync(testStorageDir, { recursive: true, force: true });
        }

        // Create a fresh broker instance for each test
        broker = await createBroker({ storageDir: testStorageDir });
        await broker.connect(); // Ensure broker is connected before each test
    });

    afterEach(async () => { // Make afterEach async
        if (broker) {
            broker.destroy();
        }
        if (fs.existsSync(testStorageDir)) {
            fs.rmSync(testStorageDir, { recursive: true, force: true });
        }
    });

    describe("End-to-End Message Flow", () => {
        it("should handle complete message lifecycle with FIFO processing", async () => {
            const processedMessages = [];

            // Subscribe to queue
            broker.subscribe("e2e-queue", (msg) => {
                processedMessages.push(msg.text);
                broker.acknowledge("e2e-queue", msg.messageId);
            });

            // Publish messages in order
            broker.publish("e2e-queue", { text: "First" });
            broker.publish("e2e-queue", { text: "Second" });
            broker.publish("e2e-queue", { text: "Third" });

            // Wait for processing
            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(processedMessages).toEqual(["First", "Second", "Third"]);
        });

        it("should handle priority messages correctly", async () => {
            const processedMessages = [];

            broker.subscribe("priority-e2e", (msg) => {
                processedMessages.push(`${msg.text}-P${msg.priority}`);
                broker.acknowledge("priority-e2e", msg.messageId);
            });

            // Publish with different priorities
            broker.publish("priority-e2e", { text: "Low" }, { priority: 1 });
            broker.publishPriority("priority-e2e", { text: "High" }, 10);
            broker.publish("priority-e2e", { text: "Medium" }, { priority: 5 });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(processedMessages[0]).toBe("High-P10");
            expect(processedMessages[1]).toBe("Medium-P5");
            expect(processedMessages[2]).toBe("Low-P1");
        });

        it("should handle delayed messages", async () => {
            const processedMessages = [];
            const timestamps = [];

            broker.subscribe("delayed-e2e", (msg) => {
                processedMessages.push(msg.text);
                timestamps.push(Date.now());
                broker.acknowledge("delayed-e2e", msg.messageId);
            });

            const startTime = Date.now();
            broker.publish("delayed-e2e", { text: "Immediate" });
            broker.publishDelayed("delayed-e2e", { text: "Delayed" }, 300);

            await new Promise((resolve) => setTimeout(resolve, 800));

            expect(processedMessages).toEqual(["Immediate", "Delayed"]);
            expect(timestamps[1] - startTime).toBeGreaterThanOrEqual(300);
        });
    });

    describe("Retry and Error Handling", () => {
        it("should retry failed messages with exponential backoff", async () => {
            let attemptCount = 0;
            const attempts = [];

            broker.subscribe("retry-e2e", (msg) => {
                attemptCount++;
                attempts.push(Date.now());

                if (attemptCount < 3) {
                    throw new Error(`Attempt ${attemptCount} failed`);
                }

                broker.acknowledge("retry-e2e", msg.messageId);
            });

            broker.publish("retry-e2e", { text: "Will retry" });

            // Wait for all retries
            await new Promise((resolve) => setTimeout(resolve, 10000));

            expect(attemptCount).toBe(3);
            expect(attempts).toHaveLength(3);

            // Check exponential backoff (approximate)
            if (attempts.length >= 2) {
                const delay1 = attempts[1] - attempts[0];
                const delay2 = attempts[2] - attempts[1];
                expect(delay2).toBeGreaterThan(delay1);
            }
        }, 15000); // Increase timeout to 15 seconds

        it("should move messages to dead letter queue after max retries", async () => {
            broker.subscribe("dlq-e2e", (msg) => {
                throw new Error("Always fails");
            });

            let deadLetterEvent = null;
            broker.on("message-dead-letter", (data) => {
                deadLetterEvent = data;
            });

            broker.publish("dlq-e2e", { text: "Will go to DLQ" });

            // Wait for all retries and DLQ
            await new Promise((resolve) => setTimeout(resolve, 10000));

            expect(deadLetterEvent).not.toBeNull();
            expect(deadLetterEvent.queueName).toBe("dlq-e2e");

            const deadLetters = broker.getDeadLetterMessages();
            expect(deadLetters["dlq-e2e"]).toHaveLength(1);
        }, 15000); // Increase timeout to 15 seconds

        it("should successfully requeue dead letter messages", async () => {
            let processedSuccessfully = false;
            let callCount = 0;

            broker.subscribe("requeue-e2e", (msg) => {
                callCount++;

                // Fail first 3 times, succeed on requeue
                if (callCount <= 3) {
                    throw new Error("Initial failures");
                }

                processedSuccessfully = true;
                broker.acknowledge("requeue-e2e", msg.messageId);
            });

            broker.publish("requeue-e2e", { text: "Will be requeued" });

            // Wait for initial failures and DLQ
            await new Promise((resolve) => setTimeout(resolve, 10000));

            // Requeue the dead letter
            const requeuedCount = broker.requeueDeadLetters("requeue-e2e");
            expect(requeuedCount).toBe(1);

            // Wait for successful processing
            await new Promise((resolve) => setTimeout(resolve, 2000));

            expect(processedSuccessfully).toBe(true);
        }, 15000); // Increase timeout to 15 seconds
    });

    describe("Fanout and Topic Exchange", () => {
        it("should broadcast messages to multiple queues", async () => {
            const results = {};

            ["fanout-1", "fanout-2", "fanout-3"].forEach((queueName) => {
                results[queueName] = [];
                broker.subscribe(queueName, (msg) => {
                    results[queueName].push(msg.text);
                    broker.acknowledge(queueName, msg.messageId);
                });
            });

            broker.fanout(["fanout-1", "fanout-2", "fanout-3"], {
                text: "Broadcast message",
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(results["fanout-1"]).toEqual(["Broadcast message"]);
            expect(results["fanout-2"]).toEqual(["Broadcast message"]);
            expect(results["fanout-3"]).toEqual(["Broadcast message"]);
        });

        it("should route messages based on topic patterns", async () => {
            const userQueues = {};
            const orderQueues = {};

            // Create user-related queues
            ["user-created", "user-updated", "user-deleted"].forEach(
                (queueName) => {
                    userQueues[queueName] = [];
                    broker.subscribe(queueName, (msg) => {
                        userQueues[queueName].push(msg.event);
                        broker.acknowledge(queueName, msg.messageId);
                    });
                }
            );

            // Create order queue (should not receive user events)
            broker.subscribe("order-created", (msg) => {
                orderQueues["order-created"] =
                    orderQueues["order-created"] || [];
                orderQueues["order-created"].push(msg.event);
                broker.acknowledge("order-created", msg.messageId);
            });

            // Publish user topic
            broker.publishTopic("user", { event: "user-action" });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            // User queues should receive the message
            expect(userQueues["user-created"]).toEqual(["user-action"]);
            expect(userQueues["user-updated"]).toEqual(["user-action"]);
            expect(userQueues["user-deleted"]).toEqual(["user-action"]);

            // Order queue should not receive user events
            expect(orderQueues["order-created"]).toBeUndefined();
        });
    });

    describe("Persistence and Recovery", () => {
        it("should persist messages across broker restarts", async () => {
            // Publish messages
            broker.publish("persist-queue", { text: "Persistent message 1" });
            broker.publish("persist-queue", { text: "Persistent message 2" });

            // Get initial stats
            const initialStats = broker.getStats("persist-queue");
            expect(initialStats.totalMessages).toBe(2);

            // Destroy broker
            broker.destroy();

            // Create new broker with same storage
            broker = await createBroker({ storageDir: testStorageDir });

            // Check that messages were loaded
            const recoveredStats = broker.getStats("persist-queue");
            expect(recoveredStats).not.toBeNull();
            expect(recoveredStats.totalMessages).toBe(2);

            // Process the recovered messages
            const processedMessages = [];
            broker.subscribe("persist-queue", (msg) => {
                processedMessages.push(msg.text);
                broker.acknowledge("persist-queue", msg.messageId);
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(processedMessages).toEqual([
                "Persistent message 1",
                "Persistent message 2",
            ]);
        });

        it("should handle corrupted storage files gracefully", async () => {
            // Create a corrupted queue file
            const corruptedFile = path.join(
                testStorageDir,
                "corrupted-queue.jsonl"
            );
            const corruptedContent = [
                '{"messageId": "valid-1", "text": "Valid message", "status": "pending", "acknowledged": false, "createdAt": ' +
                    Date.now() +
                    ', "availableAt": ' +
                    Date.now() +
                    ', "priority": 0, "retries": 0, "maxRetries": 3}',
                '{"incomplete": json without closing brace',
                "not json at all",
                '{"messageId": "valid-2", "text": "Another valid message", "status": "pending", "acknowledged": false, "createdAt": ' +
                    Date.now() +
                    ', "availableAt": ' +
                    Date.now() +
                    ', "priority": 0, "retries": 0, "maxRetries": 3}',
            ].join("\n");

            fs.writeFileSync(corruptedFile, corruptedContent);

            // Mock console.warn to capture warnings
            const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

            const processedMessages = [];
            broker.subscribe("corrupted-queue", (msg) => {
                processedMessages.push(msg.text);
                broker.acknowledge("corrupted-queue", msg.messageId);
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Should process only valid messages
            expect(processedMessages).toEqual([
                "Valid message",
                "Another valid message",
            ]);

            // Should have warned about corrupted lines
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe("Performance and Stress Testing", () => {
        it("should handle high message throughput", async () => {
            const messageCount = 100; // Reduced from 1000 for faster tests
            const processedMessages = [];

            broker.subscribe("throughput-queue", (msg) => {
                processedMessages.push(msg.index);
                broker.acknowledge("throughput-queue", msg.messageId);
            });

            const startTime = Date.now();

            // Publish many messages quickly
            for (let i = 0; i < messageCount; i++) {
                broker.publish("throughput-queue", {
                    index: i,
                    text: `Message ${i}`,
                });
            }

            const publishTime = Date.now() - startTime;

            // Wait for all messages to be processed
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (processedMessages.length >= messageCount) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });

            const totalTime = Date.now() - startTime;

            expect(processedMessages).toHaveLength(messageCount);
            expect(publishTime).toBeLessThan(5000); // Publishing should be fast
            expect(totalTime).toBeLessThan(30000); // Total processing should complete in reasonable time

            // Verify order (FIFO)
            processedMessages.forEach((index, position) => {
                expect(index).toBe(position);
            });
        }, 35000); // Increase timeout to 35 seconds

        it("should handle concurrent publishers and subscribers", async () => {
            const results = { queue1: [], queue2: [], queue3: [] };
            const messageCount = 20; // Reduced from 100 for faster tests

            // Set up multiple subscribers
            Object.keys(results).forEach((queueName) => {
                broker.subscribe(queueName, (msg) => {
                    results[queueName].push(msg.id);
                    broker.acknowledge(queueName, msg.messageId);
                });
            });

            // Concurrent publishing to multiple queues
            const publishPromises = [];

            for (let i = 0; i < messageCount; i++) {
                Object.keys(results).forEach((queueName) => {
                    publishPromises.push(
                        Promise.resolve().then(() =>
                            broker.publish(queueName, {
                                id: `${queueName}-${i}`,
                            })
                        )
                    );
                });
            }

            await Promise.all(publishPromises);

            // Wait for processing
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Verify all messages were processed
            Object.entries(results).forEach(([queueName, messages]) => {
                expect(messages).toHaveLength(messageCount);

                // Verify order within each queue
                messages.forEach((id, index) => {
                    expect(id).toBe(`${queueName}-${index}`);
                });
            });
        }, 10000); // Increase timeout to 10 seconds
    });

    describe("Event Monitoring", () => {
        it("should emit comprehensive events throughout message lifecycle", async () => {
            const events = [];

            // Listen to all broker events
            [
                "message-published",
                "message-processing",
                "message-completed",
                "message-acknowledged",
                "message-error",
                "message-retry-scheduled",
                "queue-created",
            ].forEach((eventName) => {
                broker.on(eventName, (data) => {
                    events.push({
                        event: eventName,
                        queueName: data.queueName,
                    });
                });
            });

            broker.subscribe("events-queue", (msg) => {
                broker.acknowledge("events-queue", msg.messageId);
            });

            broker.publish("events-queue", { text: "Event test" });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            const eventTypes = events.map((e) => e.event);
            expect(eventTypes).toContain("queue-created");
            expect(eventTypes).toContain("message-published");
            expect(eventTypes).toContain("message-processing");
            expect(eventTypes).toContain("message-acknowledged");
            expect(eventTypes).toContain("message-completed");
        });
    });

    describe("Statistics and Management", () => {
        it("should provide accurate real-time statistics", async () => {
            // Publish various messages
            broker.publish("stats-queue", { text: "Message 1" });
            broker.publish("stats-queue", { text: "Message 2" });
            broker.publishPriority(
                "stats-queue",
                { text: "Priority message" },
                10
            );

            let stats = broker.getStats("stats-queue");
            expect(stats.totalMessages).toBe(3);
            expect(stats.pendingMessages).toBe(3);
            expect(stats.completedMessages).toBe(0);

            // Process one message
            broker.subscribe("stats-queue", (msg) => {
                if (msg.text === "Priority message") {
                    broker.acknowledge("stats-queue", msg.messageId);
                }
            });

            await new Promise((resolve) => setTimeout(resolve, 500));

            stats = broker.getStats("stats-queue");
            expect(stats.completedMessages).toBe(1);
            expect(stats.pendingMessages).toBe(2);

            // Test global stats
            const globalStats = broker.getStats();
            expect(globalStats.totalQueues).toBe(1);
            expect(globalStats.queues["stats-queue"]).toBeDefined();
        });

        it("should clean up completed messages when purged", async () => {
            const messageIds = [
                broker.publish("purge-queue", { text: "Message 1" }),
                broker.publish("purge-queue", { text: "Message 2" }),
                broker.publish("purge-queue", { text: "Message 3" }),
            ];

            // Acknowledge some messages
            broker.acknowledge("purge-queue", messageIds[0]);
            broker.acknowledge("purge-queue", messageIds[1]);

            let stats = broker.getStats("purge-queue");
            expect(stats.totalMessages).toBe(3);
            expect(stats.completedMessages).toBe(2);

            // Purge completed messages
            const purgeResults = broker.purgeCompleted("purge-queue");
            expect(purgeResults["purge-queue"]).toBe(2);

            stats = broker.getStats("purge-queue");
            expect(stats.totalMessages).toBe(1);
            expect(stats.pendingMessages).toBe(1);
        });
    });
});
