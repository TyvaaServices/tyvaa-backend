import Queue from "../../src/broker/queue.js";
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

describe("Broker", () => {
    let testStorageDir;
    let originalBroker;

    beforeEach(async () => {
        // Create a test storage directory
        testStorageDir = path.join(process.cwd(), "test-queues");
        if (fs.existsSync(testStorageDir)) {
            fs.rmSync(testStorageDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testStorageDir, { recursive: true });

        // Create a fresh broker instance for each test
        const BrokerClass = (await import("../../src/broker/broker.js")).default
            .constructor;
        originalBroker = new BrokerClass({ storageDir: testStorageDir });

        // Clear any existing queues
        originalBroker.queues = {};
    });

    afterEach(() => {
        // Clean up
        if (originalBroker) {
            originalBroker.destroy();
        }
        if (fs.existsSync(testStorageDir)) {
            fs.rmSync(testStorageDir, { recursive: true, force: true });
        }
    });

    describe("Queue Management", () => {
        it("should create and return a queue", () => {
            const queue = originalBroker.getQueue("test-queue");
            expect(queue).toBeDefined();
            expect(queue).toBeInstanceOf(Queue);
            expect(queue.name).toBe("test-queue");
        });

        it("should return the same queue instance for the same name", () => {
            const queue1 = originalBroker.getQueue("same-queue");
            const queue2 = originalBroker.getQueue("same-queue");
            expect(queue1).toBe(queue2);
        });

        it("should apply global retry policy to new queues", () => {
            const queue = originalBroker.getQueue("retry-queue");
            expect(queue.config.maxRetries).toBe(3);
            expect(queue.config.retryDelay).toBe(1000);
            expect(queue.config.retryBackoffMultiplier).toBe(2);
        });

        it("should apply queue-specific configuration", () => {
            const queueConfig = { maxRetries: 5, retryDelay: 2000 };
            const queue = originalBroker.getQueue("custom-queue", queueConfig);
            expect(queue.config.maxRetries).toBe(5);
            expect(queue.config.retryDelay).toBe(2000);
        });

        it("should emit queue-created event", (done) => {
            originalBroker.on("queue-created", ({ queueName, queue }) => {
                expect(queueName).toBe("event-test-queue");
                expect(queue).toBeInstanceOf(Queue);
                done();
            });

            originalBroker.getQueue("event-test-queue");
        });
    });

    describe("Message Publishing", () => {
        it("should publish a basic message", () => {
            const messageId = originalBroker.publish("test-queue", {
                text: "Hello World",
            });
            expect(messageId).toBeDefined();
            expect(typeof messageId).toBe("string");
        });

        it("should publish a delayed message", () => {
            const messageId = originalBroker.publishDelayed(
                "delayed-queue",
                { text: "Delayed message" },
                1000
            );
            expect(messageId).toBeDefined();

            const queue = originalBroker.getQueue("delayed-queue");
            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.availableAt).toBeGreaterThan(Date.now());
        });

        it("should publish a priority message", () => {
            const messageId = originalBroker.publishPriority(
                "priority-queue",
                { text: "High priority" },
                10
            );
            expect(messageId).toBeDefined();

            const queue = originalBroker.getQueue("priority-queue");
            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.priority).toBe(10);
        });

        it("should publish with custom options", () => {
            const options = { delay: 500, priority: 5, maxRetries: 2 };
            const messageId = originalBroker.publish(
                "options-queue",
                { text: "Custom options" },
                options
            );

            const queue = originalBroker.getQueue("options-queue");
            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.priority).toBe(5);
            expect(message.maxRetries).toBe(2);
            expect(message.availableAt).toBeGreaterThan(Date.now());
        });
    });

    describe("Fanout Exchange", () => {
        it("should publish to multiple queues", () => {
            const queueNames = ["fanout-1", "fanout-2", "fanout-3"];
            const messageIds = originalBroker.fanout(queueNames, {
                text: "Broadcast",
            });

            expect(messageIds).toHaveLength(3);
            messageIds.forEach((id) => expect(id).toBeDefined());

            queueNames.forEach((queueName) => {
                const queue = originalBroker.getQueue(queueName);
                expect(queue.messages).toHaveLength(1);
                expect(queue.messages[0].text).toBe("Broadcast");
            });
        });

        it("should apply options to all queues in fanout", () => {
            const queueNames = ["fanout-priority-1", "fanout-priority-2"];
            const options = { priority: 8 };
            originalBroker.fanout(
                queueNames,
                { text: "High priority broadcast" },
                options
            );

            queueNames.forEach((queueName) => {
                const queue = originalBroker.getQueue(queueName);
                expect(queue.messages[0].priority).toBe(8);
            });
        });
    });

    describe("Topic Exchange", () => {
        it("should publish to matching queues", () => {
            // Create queues that should match
            originalBroker.getQueue("user-created");
            originalBroker.getQueue("user-updated");
            originalBroker.getQueue("order-created");

            const messageIds = originalBroker.publishTopic("user", {
                event: "user action",
            });

            expect(messageIds).toHaveLength(2); // Should match user-created and user-updated
        });
    });

    describe("Subscription and Message Processing", () => {
        it("should subscribe to a queue", () => {
            const callback = jest.fn();
            originalBroker.subscribe("sub-queue", callback);

            const queue = originalBroker.getQueue("sub-queue");
            expect(queue.subscribers).toHaveLength(1);
            expect(queue.subscribers[0]).toBe(callback);
        });

        it("should unsubscribe from a queue", () => {
            const callback = jest.fn();
            originalBroker.subscribe("unsub-queue", callback);
            originalBroker.unsubscribe("unsub-queue", callback);

            const queue = originalBroker.getQueue("unsub-queue");
            expect(queue.subscribers).toHaveLength(0);
        });

        it("should process messages with subscribers", (done) => {
            const callback = jest.fn((msg) => {
                expect(msg.text).toBe("Test message");
                originalBroker.acknowledge("process-queue", msg.messageId);
                done();
            });

            originalBroker.subscribe("process-queue", callback);
            originalBroker.publish("process-queue", { text: "Test message" });
        });

        it("should acknowledge messages", () => {
            const messageId = originalBroker.publish("ack-queue", {
                text: "Acknowledge me",
            });
            originalBroker.acknowledge("ack-queue", messageId);

            const queue = originalBroker.getQueue("ack-queue");
            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.acknowledged).toBe(true);
            expect(message.status).toBe("completed");
        });
    });

    describe("Statistics and Monitoring", () => {
        it("should return stats for a specific queue", () => {
            originalBroker.publish("stats-queue", { text: "Test" });
            const stats = originalBroker.getStats("stats-queue");

            expect(stats).toBeDefined();
            expect(stats.queueName).toBe("stats-queue");
            expect(stats.totalMessages).toBe(1);
            expect(stats.pendingMessages).toBe(1);
            expect(stats.subscriberCount).toBe(0);
        });

        it("should return stats for all queues", () => {
            originalBroker.publish("queue-1", { text: "Test 1" });
            originalBroker.publish("queue-2", { text: "Test 2" });

            const stats = originalBroker.getStats();
            expect(stats.totalQueues).toBe(2);
            expect(stats.queues["queue-1"]).toBeDefined();
            expect(stats.queues["queue-2"]).toBeDefined();
        });

        it("should return null for non-existent queue stats", () => {
            const stats = originalBroker.getStats("non-existent");
            expect(stats).toBeNull();
        });
    });

    describe("Message Purging", () => {
        it("should purge completed messages from a specific queue", () => {
            const messageId = originalBroker.publish("purge-queue", {
                text: "To be purged",
            });
            originalBroker.acknowledge("purge-queue", messageId);

            const result = originalBroker.purgeCompleted("purge-queue");
            expect(result["purge-queue"]).toBe(1);

            const queue = originalBroker.getQueue("purge-queue");
            expect(queue.messages).toHaveLength(0);
        });

        it("should purge completed messages from all queues", () => {
            const messageId1 = originalBroker.publish("purge-all-1", {
                text: "Test 1",
            });
            const messageId2 = originalBroker.publish("purge-all-2", {
                text: "Test 2",
            });

            originalBroker.acknowledge("purge-all-1", messageId1);
            originalBroker.acknowledge("purge-all-2", messageId2);

            const results = originalBroker.purgeCompleted();
            expect(results["purge-all-1"]).toBe(1);
            expect(results["purge-all-2"]).toBe(1);
        });
    });

    describe("Dead Letter Queue Management", () => {
        it("should get dead letter messages", async () => {
            const callback = jest.fn(() => {
                throw new Error("Always fails");
            });

            originalBroker.subscribe("dead-letter-queue", callback);
            originalBroker.publish("dead-letter-queue", { text: "Will fail" });

            // Wait for message to be processed and moved to dead letter
            await new Promise((resolve) => {
                originalBroker.on("message-dead-letter", () => {
                    const deadLetters = originalBroker.getDeadLetterMessages();
                    expect(deadLetters["dead-letter-queue"]).toBeDefined();
                    expect(deadLetters["dead-letter-queue"]).toHaveLength(1);
                    resolve();
                });
            });
        });

        it("should requeue dead letter messages", async () => {
            const callback = jest.fn(() => {
                throw new Error("Always fails");
            });

            originalBroker.subscribe("requeue-queue", callback);
            originalBroker.publish("requeue-queue", {
                text: "Will be requeued",
            });

            await new Promise((resolve) => {
                originalBroker.on("message-dead-letter", () => {
                    const requeuedCount =
                        originalBroker.requeueDeadLetters("requeue-queue");
                    expect(requeuedCount).toBe(1);

                    const queue = originalBroker.getQueue("requeue-queue");
                    expect(
                        queue.messages.some((m) => m.status === "pending")
                    ).toBe(true);
                    resolve();
                });
            });
        });
    });

    describe("Processing Control", () => {
        it("should start processing for a specific queue", () => {
            const queue = originalBroker.getQueue("start-queue");
            queue.stopProcessing();
            expect(queue.processingInterval).toBeNull();

            originalBroker.startProcessing("start-queue");
            expect(queue.processingInterval).toBeDefined();
        });

        it("should stop processing for a specific queue", () => {
            const queue = originalBroker.getQueue("stop-queue");
            expect(queue.processingInterval).toBeDefined();

            originalBroker.stopProcessing("stop-queue");
            expect(queue.processingInterval).toBeNull();
        });

        it("should start processing for all queues", () => {
            const queue1 = originalBroker.getQueue("start-all-1");
            const queue2 = originalBroker.getQueue("start-all-2");

            queue1.stopProcessing();
            queue2.stopProcessing();

            originalBroker.startProcessing();

            expect(queue1.processingInterval).toBeDefined();
            expect(queue2.processingInterval).toBeDefined();
        });

        it("should stop processing for all queues", () => {
            const queue1 = originalBroker.getQueue("stop-all-1");
            const queue2 = originalBroker.getQueue("stop-all-2");

            originalBroker.stopProcessing();

            expect(queue1.processingInterval).toBeNull();
            expect(queue2.processingInterval).toBeNull();
        });
    });

    describe("Event Forwarding", () => {
        it("should forward queue events to broker level", (done) => {
            let eventCount = 0;
            const expectedEvents = 2;

            originalBroker.on("message-published", (data) => {
                expect(data.queueName).toBe("event-queue");
                expect(data.messageId).toBeDefined();
                eventCount++;
                if (eventCount === expectedEvents) done();
            });

            originalBroker.on("queue-created", () => {
                eventCount++;
                if (eventCount === expectedEvents) done();
            });

            originalBroker.publish("event-queue", { text: "Event test" });
        });
    });

    describe("Cleanup", () => {
        it("should destroy broker and clean up resources", () => {
            const queue1 = originalBroker.getQueue("cleanup-1");
            const queue2 = originalBroker.getQueue("cleanup-2");

            expect(Object.keys(originalBroker.queues)).toHaveLength(2);

            originalBroker.destroy();

            expect(Object.keys(originalBroker.queues)).toHaveLength(0);
            expect(queue1.processingInterval).toBeNull();
            expect(queue2.processingInterval).toBeNull();
        });
    });

    describe("Error Handling", () => {
        it("should handle unsubscribe for non-existent queue", () => {
            expect(() => {
                originalBroker.unsubscribe("non-existent", jest.fn());
            }).not.toThrow();
        });

        it("should handle acknowledge for non-existent queue", () => {
            expect(() => {
                originalBroker.acknowledge("non-existent", "fake-id");
            }).not.toThrow();
        });

        it("should handle requeue for non-existent queue", () => {
            const result = originalBroker.requeueDeadLetters("non-existent");
            expect(result).toBe(0);
        });
    });
});
