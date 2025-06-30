import Queue from "../../src/broker/queue.js";
import FileStorage from "../../src/broker/storage.js";
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

describe("Queue", () => {
    let testStorageDir;
    let storage;
    let queue;

    beforeEach(() => {
        // Create a test storage directory
        testStorageDir = path.join(process.cwd(), "test-queue-storage");
        if (fs.existsSync(testStorageDir)) {
            fs.rmSync(testStorageDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testStorageDir, { recursive: true });

        storage = new FileStorage(testStorageDir);
        queue = new Queue("test-queue", storage);

        // Stop auto-processing for most tests
        queue.stopProcessing();
    });

    afterEach(() => {
        if (queue) {
            queue.destroy();
        }
        if (fs.existsSync(testStorageDir)) {
            fs.rmSync(testStorageDir, { recursive: true, force: true });
        }
    });

    describe("Initialization", () => {
        it("should initialize with correct properties", () => {
            expect(queue.name).toBe("test-queue");
            expect(queue.storage).toBe(storage);
            expect(queue.subscribers).toEqual([]);
            expect(queue.messages).toEqual([]);
            expect(queue.deadLetterQueue).toEqual([]);
            expect(queue.processing).toBe(false);
        });

        it("should load existing messages from storage", () => {
            // Create a queue file with existing messages
            const existingMessage = {
                messageId: "existing-123",
                text: "Existing message",
                status: "pending",
                acknowledged: false,
                createdAt: Date.now(),
                availableAt: Date.now(),
                priority: 0,
                retries: 0,
                maxRetries: 3,
            };

            storage.save("existing-queue", existingMessage);

            const existingQueue = new Queue("existing-queue", storage);
            existingQueue.stopProcessing();

            expect(existingQueue.messages).toHaveLength(1);
            expect(existingQueue.messages[0].messageId).toBe("existing-123");

            existingQueue.destroy();
        });

        it("should start processing by default", () => {
            const autoQueue = new Queue("auto-queue", storage);
            expect(autoQueue.processingInterval).toBeDefined();
            autoQueue.destroy();
        });
    });

    describe("Message Publishing", () => {
        it("should publish a basic message", () => {
            const messageId = queue.publish({ text: "Hello World" });

            expect(messageId).toBeDefined();
            expect(typeof messageId).toBe("string");
            expect(queue.messages).toHaveLength(1);

            const message = queue.messages[0];
            expect(message.messageId).toBe(messageId);
            expect(message.text).toBe("Hello World");
            expect(message.status).toBe("pending");
            expect(message.acknowledged).toBe(false);
            expect(message.priority).toBe(0);
            expect(message.retries).toBe(0);
        });

        it("should publish with delay option", () => {
            const delay = 5000;
            const beforeTime = Date.now();
            const messageId = queue.publish({ text: "Delayed" }, { delay });

            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.availableAt).toBeGreaterThanOrEqual(
                beforeTime + delay
            );
        });

        it("should publish with priority option", () => {
            const messageId = queue.publish(
                { text: "High priority" },
                { priority: 10 }
            );

            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.priority).toBe(10);
        });

        it("should publish with custom maxRetries", () => {
            const messageId = queue.publish(
                { text: "Custom retries" },
                { maxRetries: 5 }
            );

            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.maxRetries).toBe(5);
        });

        it("should emit message-published event", (done) => {
            queue.on("message-published", (data) => {
                expect(data.messageId).toBeDefined();
                expect(data.queueName).toBe("test-queue");
                expect(data.message.text).toBe("Event test");
                done();
            });

            queue.publish({ text: "Event test" });
        });

        it("should save message to storage", () => {
            const spy = jest.spyOn(storage, "save");
            queue.publish({ text: "Persistent message" });

            expect(spy).toHaveBeenCalledWith(
                "test-queue",
                expect.objectContaining({
                    text: "Persistent message",
                    status: "pending",
                })
            );
        });
    });

    describe("Message Sorting", () => {
        it("should sort messages by priority then by timestamp", () => {
            // Publish messages with different priorities
            queue.publish({ text: "Low" }, { priority: 1 });
            queue.publish({ text: "High" }, { priority: 10 });
            queue.publish({ text: "Medium" }, { priority: 5 });
            queue.publish({ text: "Default" }); // priority 0

            expect(queue.messages[0].text).toBe("High"); // priority 10
            expect(queue.messages[1].text).toBe("Medium"); // priority 5
            expect(queue.messages[2].text).toBe("Low"); // priority 1
            expect(queue.messages[3].text).toBe("Default"); // priority 0
        });

        it("should maintain FIFO order within same priority", () => {
            queue.publish({ text: "First" }, { priority: 5 });
            queue.publish({ text: "Second" }, { priority: 5 });
            queue.publish({ text: "Third" }, { priority: 5 });

            const samePriorityMessages = queue.messages.filter(
                (m) => m.priority === 5
            );
            expect(samePriorityMessages[0].text).toBe("First");
            expect(samePriorityMessages[1].text).toBe("Second");
            expect(samePriorityMessages[2].text).toBe("Third");
        });
    });

    describe("Subscription Management", () => {
        it("should add subscribers", () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            queue.subscribe(callback1);
            queue.subscribe(callback2);

            expect(queue.subscribers).toHaveLength(2);
            expect(queue.subscribers).toContain(callback1);
            expect(queue.subscribers).toContain(callback2);
        });

        it("should remove subscribers", () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            queue.subscribe(callback1);
            queue.subscribe(callback2);
            queue.unsubscribe(callback1);

            expect(queue.subscribers).toHaveLength(1);
            expect(queue.subscribers).toContain(callback2);
            expect(queue.subscribers).not.toContain(callback1);
        });

        it("should emit subscriber events", (done) => {
            let eventCount = 0;
            const callback = jest.fn();

            queue.on("subscriber-added", (data) => {
                expect(data.queueName).toBe("test-queue");
                expect(data.subscriberCount).toBe(1);
                eventCount++;
            });

            queue.on("subscriber-removed", (data) => {
                expect(data.queueName).toBe("test-queue");
                expect(data.subscriberCount).toBe(0);
                eventCount++;
                if (eventCount === 2) done();
            });

            queue.subscribe(callback);
            queue.unsubscribe(callback);
        });
    });

    describe("Message Acknowledgment", () => {
        it("should acknowledge a message", () => {
            const messageId = queue.publish({ text: "Acknowledge me" });
            queue.acknowledge(messageId);

            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.acknowledged).toBe(true);
            expect(message.status).toBe("completed");
        });

        it("should not acknowledge already acknowledged message", () => {
            const messageId = queue.publish({ text: "Already acked" });
            queue.acknowledge(messageId);

            const spy = jest.spyOn(queue, "emit");
            queue.acknowledge(messageId); // Try to ack again

            expect(spy).not.toHaveBeenCalledWith(
                "message-acknowledged",
                expect.anything()
            );
        });

        it("should emit message-acknowledged event", (done) => {
            const messageId = queue.publish({ text: "Event test" });

            queue.on("message-acknowledged", (data) => {
                expect(data.messageId).toBe(messageId);
                expect(data.queueName).toBe("test-queue");
                done();
            });

            queue.acknowledge(messageId);
        });
    });

    describe("Message Processing", () => {
        it("should process messages with subscribers", async () => {
            const callback = jest.fn();
            queue.subscribe(callback);

            const messageId = queue.publish({ text: "Process me" });
            await queue.processNextMessage();

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    messageId,
                    text: "Process me",
                })
            );
        });

        it("should not process delayed messages before their time", async () => {
            const callback = jest.fn();
            queue.subscribe(callback);

            queue.publish({ text: "Too early" }, { delay: 10000 }); // 10 seconds delay
            await queue.processNextMessage();

            expect(callback).not.toHaveBeenCalled();
        });

        it("should not process already acknowledged messages", async () => {
            const callback = jest.fn();
            queue.subscribe(callback);

            const messageId = queue.publish({ text: "Already done" });
            queue.acknowledge(messageId);

            await queue.processNextMessage();

            expect(callback).not.toHaveBeenCalled();
        });

        it("should mark message as processing during execution", async () => {
            let messageStatus;
            const callback = jest.fn((msg) => {
                messageStatus = queue.messages.find(
                    (m) => m.messageId === msg.messageId
                ).status;
            });

            queue.subscribe(callback);
            queue.publish({ text: "Status check" });

            await queue.processNextMessage();

            expect(messageStatus).toBe("processing");
        });

        it("should emit processing events", async () => {
            const events = [];
            const callback = jest.fn((msg) => {
                queue.acknowledge(msg.messageId);
            });

            queue.subscribe(callback);

            queue.on("message-processing", (data) => events.push("processing"));
            queue.on("message-completed", (data) => events.push("completed"));

            queue.publish({ text: "Event tracking" });
            await queue.processNextMessage();

            expect(events).toEqual(["processing", "completed"]);
        });
    });

    describe("Retry Logic", () => {
        it("should retry failed messages", async () => {
            const callback = jest.fn(() => {
                throw new Error("Simulated failure");
            });

            queue.subscribe(callback);
            const messageId = queue.publish({ text: "Will fail" });

            await queue.processNextMessage();

            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            expect(message.retries).toBe(1);
            expect(message.status).toBe("pending");
            expect(message.availableAt).toBeGreaterThan(Date.now());
        });

        it("should use exponential backoff for retries", async () => {
            const callback = jest.fn(() => {
                throw new Error("Always fails");
            });

            queue.subscribe(callback);
            const messageId = queue.publish({ text: "Backoff test" });

            // First failure
            await queue.processNextMessage();
            const message1 = queue.messages.find(
                (m) => m.messageId === messageId
            );
            const firstRetryDelay = message1.availableAt - Date.now();

            // Simulate time passing and second failure
            message1.availableAt = Date.now() - 1000;
            await queue.processNextMessage();
            const message2 = queue.messages.find(
                (m) => m.messageId === messageId
            );
            const secondRetryDelay = message2.availableAt - Date.now();

            expect(secondRetryDelay).toBeGreaterThan(firstRetryDelay);
        });

        it("should emit retry-scheduled event", async () => {
            const callback = jest.fn(() => {
                throw new Error("Fail for retry");
            });

            queue.subscribe(callback);

            const retryData = await new Promise((resolve) => {
                queue.on("message-retry-scheduled", resolve);
                queue.publish({ text: "Retry event test" });
                queue.processNextMessage();
            });

            expect(retryData.retryCount).toBe(1);
            expect(retryData.queueName).toBe("test-queue");
            expect(retryData.nextAttemptAt).toBeGreaterThan(Date.now());
        });
    });

    describe("Dead Letter Queue", () => {
        it("should move messages to dead letter queue after max retries", async () => {
            const callback = jest.fn(() => {
                throw new Error("Always fails");
            });

            queue.subscribe(callback);
            const messageId = queue.publish(
                { text: "Will go to DLQ" },
                { maxRetries: 2 }
            );

            // Fail the message enough times to exceed max retries
            const message = queue.messages.find(
                (m) => m.messageId === messageId
            );
            message.retries = 2; // Set to max retries

            await queue.processNextMessage();

            expect(queue.deadLetterQueue).toHaveLength(1);
            expect(queue.deadLetterQueue[0].messageId).toBe(messageId);
            expect(queue.deadLetterQueue[0].status).toBe("dead");
        });

        it("should emit dead-letter event", async () => {
            const callback = jest.fn(() => {
                throw new Error("DLQ test");
            });

            queue.subscribe(callback);

            const deadLetterData = await new Promise((resolve) => {
                queue.on("message-dead-letter", resolve);
                const messageId = queue.publish(
                    { text: "DLQ event test" },
                    { maxRetries: 1 }
                );

                // Force max retries
                const message = queue.messages.find(
                    (m) => m.messageId === messageId
                );
                message.retries = 1;

                queue.processNextMessage();
            });

            expect(deadLetterData.queueName).toBe("test-queue");
            expect(deadLetterData.messageId).toBeDefined();
        });
    });

    describe("Processing Control", () => {
        it("should start processing", () => {
            expect(queue.processingInterval).toBeNull();
            queue.startProcessing();
            expect(queue.processingInterval).toBeDefined();
        });

        it("should stop processing", () => {
            queue.startProcessing();
            expect(queue.processingInterval).toBeDefined();

            queue.stopProcessing();
            expect(queue.processingInterval).toBeNull();
        });

        it("should not start multiple processing intervals", () => {
            queue.startProcessing();
            const firstInterval = queue.processingInterval;

            queue.startProcessing(); // Try to start again

            expect(queue.processingInterval).toBe(firstInterval);
        });

        it("should emit processing control events", (done) => {
            let eventCount = 0;

            queue.on("processing-started", (data) => {
                expect(data.queueName).toBe("test-queue");
                eventCount++;
            });

            queue.on("processing-stopped", (data) => {
                expect(data.queueName).toBe("test-queue");
                eventCount++;
                if (eventCount === 2) done();
            });

            queue.startProcessing();
            queue.stopProcessing();
        });
    });

    describe("Statistics", () => {
        it("should return correct queue statistics", () => {
            // Add various messages
            const messageId1 = queue.publish({ text: "Pending" });
            const messageId2 = queue.publish({ text: "Completed" });
            queue.acknowledge(messageId2);

            // Add a dead letter message
            queue.deadLetterQueue.push({
                messageId: "dead-123",
                text: "Dead message",
                status: "dead",
            });

            // Add subscribers
            queue.subscribe(jest.fn());
            queue.subscribe(jest.fn());

            const stats = queue.getStats();

            expect(stats.queueName).toBe("test-queue");
            expect(stats.totalMessages).toBe(2);
            expect(stats.pendingMessages).toBe(1);
            expect(stats.completedMessages).toBe(1);
            expect(stats.deadLetterMessages).toBe(1);
            expect(stats.subscriberCount).toBe(2);
        });
    });

    describe("Message Purging", () => {
        it("should purge completed and acknowledged messages", () => {
            const messageId1 = queue.publish({ text: "To be purged" });
            const messageId2 = queue.publish({ text: "Stay pending" });

            queue.acknowledge(messageId1);

            const purgedCount = queue.purgeCompleted();

            expect(purgedCount).toBe(1);
            expect(queue.messages).toHaveLength(1);
            expect(queue.messages[0].messageId).toBe(messageId2);
        });

        it("should emit messages-purged event", (done) => {
            const messageId = queue.publish({ text: "Purge event test" });
            queue.acknowledge(messageId);

            queue.on("messages-purged", (data) => {
                expect(data.queueName).toBe("test-queue");
                expect(data.purgedCount).toBe(1);
                done();
            });

            queue.purgeCompleted();
        });
    });

    describe("Error Handling", () => {
        it("should handle subscriber errors gracefully", async () => {
            const goodCallback = jest.fn();
            const badCallback = jest.fn(() => {
                throw new Error("Subscriber error");
            });

            queue.subscribe(goodCallback);
            queue.subscribe(badCallback);

            const errorData = await new Promise((resolve) => {
                queue.on("subscriber-error", resolve);
                queue.publish({ text: "Error test" });
                queue.processNextMessage();
            });

            expect(errorData.error).toBe("Subscriber error");
            expect(errorData.queueName).toBe("test-queue");
        });

        it("should handle persistence errors", () => {
            const spy = jest
                .spyOn(fs, "writeFileSync")
                .mockImplementation(() => {
                    throw new Error("Disk full");
                });

            const errorData = new Promise((resolve) => {
                queue.on("persistence-error", resolve);
                queue.persistMessages();
            });

            return errorData.then((data) => {
                expect(data.error).toBe("Disk full");
                expect(data.queueName).toBe("test-queue");
                spy.mockRestore();
            });
        });
    });

    describe("Cleanup", () => {
        it("should clean up resources on destroy", () => {
            queue.subscribe(jest.fn());
            queue.startProcessing();

            expect(queue.subscribers).toHaveLength(1);
            expect(queue.processingInterval).toBeDefined();

            queue.destroy();

            expect(queue.subscribers).toHaveLength(0);
            expect(queue.processingInterval).toBeNull();
        });
    });
});
