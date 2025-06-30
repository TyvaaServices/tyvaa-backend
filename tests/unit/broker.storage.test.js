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

describe("FileStorage", () => {
    let testStorageDir;
    let storage;

    beforeEach(() => {
        // Create a unique test storage directory for each test
        testStorageDir = path.join(
            process.cwd(),
            `test-storage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        );
        if (fs.existsSync(testStorageDir)) {
            fs.rmSync(testStorageDir, { recursive: true, force: true });
        }
        storage = new FileStorage(testStorageDir);
    });

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(testStorageDir)) {
            fs.rmSync(testStorageDir, { recursive: true, force: true });
        }
    });

    describe("Initialization", () => {
        it("should create storage directory if it doesn't exist", () => {
            expect(fs.existsSync(testStorageDir)).toBe(true);
            expect(storage.dir).toBe(testStorageDir);
        });

        it("should use default directory if none provided", () => {
            const defaultStorage = new FileStorage();
            expect(defaultStorage.dir).toBe("./queues");

            // Clean up default directory if created
            if (fs.existsSync("./queues")) {
                const files = fs.readdirSync("./queues");
                if (files.length === 0) {
                    fs.rmdirSync("./queues");
                }
            }
        });

        it("should not fail if directory already exists", () => {
            // Create the directory first
            fs.mkdirSync(testStorageDir, { recursive: true });

            // Should not throw error
            expect(() => {
                new FileStorage(testStorageDir);
            }).not.toThrow();
        });
    });

    describe("Message Saving", () => {
        it("should save a message to queue file", () => {
            const message = {
                messageId: "test-123",
                text: "Hello World",
                status: "pending",
                createdAt: Date.now(),
            };

            storage.save("test-queue", message);

            const filePath = path.join(testStorageDir, "test-queue.jsonl");
            expect(fs.existsSync(filePath)).toBe(true);

            const content = fs.readFileSync(filePath, "utf-8");
            expect(content.trim()).toBe(JSON.stringify(message));
        });

        it("should append multiple messages to the same file", () => {
            const message1 = { messageId: "msg-1", text: "First" };
            const message2 = { messageId: "msg-2", text: "Second" };

            storage.save("append-queue", message1);
            storage.save("append-queue", message2);

            const filePath = path.join(testStorageDir, "append-queue.jsonl");
            const content = fs.readFileSync(filePath, "utf-8");
            const lines = content.trim().split("\n");

            expect(lines).toHaveLength(2);
            expect(JSON.parse(lines[0])).toEqual(message1);
            expect(JSON.parse(lines[1])).toEqual(message2);
        });

        it("should handle special characters in messages", () => {
            const message = {
                messageId: "special-123",
                text: 'Message with émojis 🚀 and quotes "hello" and new\nlines',
                data: { unicode: "测试", emoji: "🎉" },
            };

            storage.save("special-queue", message);

            const loaded = storage.load("special-queue");
            expect(loaded).toHaveLength(1);
            expect(loaded[0]).toEqual(message);
        });

        it("should create separate files for different queues", () => {
            storage.save("queue-1", { messageId: "msg-1" });
            storage.save("queue-2", { messageId: "msg-2" });

            expect(
                fs.existsSync(path.join(testStorageDir, "queue-1.jsonl"))
            ).toBe(true);
            expect(
                fs.existsSync(path.join(testStorageDir, "queue-2.jsonl"))
            ).toBe(true);
        });
    });

    describe("Message Loading", () => {
        it("should return empty array for non-existent queue", () => {
            const messages = storage.load("non-existent-queue");
            expect(messages).toEqual([]);
        });

        it("should return empty array for empty file", () => {
            const filePath = path.join(testStorageDir, "empty-queue.jsonl");
            fs.writeFileSync(filePath, "");

            const messages = storage.load("empty-queue");
            expect(messages).toEqual([]);
        });

        it("should load single message correctly", () => {
            const message = {
                messageId: "load-test-123",
                text: "Load test message",
                priority: 5,
                createdAt: 1234567890,
            };

            storage.save("load-queue", message);
            const loaded = storage.load("load-queue");

            expect(loaded).toHaveLength(1);
            expect(loaded[0]).toEqual(message);
        });

        it("should load multiple messages in correct order", () => {
            const messages = [
                { messageId: "msg-1", text: "First", order: 1 },
                { messageId: "msg-2", text: "Second", order: 2 },
                { messageId: "msg-3", text: "Third", order: 3 },
            ];

            messages.forEach((msg) => storage.save("order-queue", msg));
            const loaded = storage.load("order-queue");

            expect(loaded).toHaveLength(3);
            loaded.forEach((msg, index) => {
                expect(msg).toEqual(messages[index]);
            });
        });

        it("should skip empty lines gracefully", () => {
            const message1 = { messageId: "msg-1", text: "First" };
            const message2 = { messageId: "msg-2", text: "Second" };

            // Create file with empty lines
            const filePath = path.join(
                testStorageDir,
                "empty-lines-queue.jsonl"
            );
            const content = [
                JSON.stringify(message1),
                "", // Empty line
                "   ", // Whitespace only
                JSON.stringify(message2),
                "", // Trailing empty line
            ].join("\n");

            fs.writeFileSync(filePath, content);

            const loaded = storage.load("empty-lines-queue");
            expect(loaded).toHaveLength(2);
            expect(loaded[0]).toEqual(message1);
            expect(loaded[1]).toEqual(message2);
        });

        it("should handle malformed JSON lines gracefully", () => {
            const validMessage = {
                messageId: "valid-123",
                text: "Valid message",
            };

            const filePath = path.join(testStorageDir, "malformed-queue.jsonl");
            const content = [
                JSON.stringify(validMessage),
                '{ "incomplete": json', // Malformed JSON
                '{ "messageId": "valid-2", "text": "Another valid" }',
                "not json at all",
                JSON.stringify({ messageId: "valid-3", text: "Last valid" }),
            ].join("\n");

            fs.writeFileSync(filePath, content);

            // Mock console.warn to capture warnings
            const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

            const loaded = storage.load("malformed-queue");

            expect(loaded).toHaveLength(3); // Only valid messages loaded
            expect(loaded[0]).toEqual(validMessage);
            expect(loaded[1].messageId).toBe("valid-2");
            expect(loaded[2].messageId).toBe("valid-3");

            // Should have warned about malformed lines
            expect(consoleSpy).toHaveBeenCalledTimes(2);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("Warning: Failed to parse line")
            );

            consoleSpy.mockRestore();
        });

        it("should handle large messages correctly", () => {
            const largeMessage = {
                messageId: "large-123",
                text: "A".repeat(10000), // 10KB of text
                data: {
                    largeArray: new Array(1000).fill({
                        key: "value",
                        number: 42,
                    }),
                    metadata: {
                        description:
                            "This is a large message for testing storage capabilities",
                    },
                },
            };

            storage.save("large-queue", largeMessage);
            const loaded = storage.load("large-queue");

            expect(loaded).toHaveLength(1);
            expect(loaded[0]).toEqual(largeMessage);
        });
    });

    describe("File System Operations", () => {
        it("should handle file permission errors gracefully", () => {
            // This test might not work on all systems, so we'll mock the error
            const originalAppendFileSync = fs.appendFileSync;
            fs.appendFileSync = jest.fn().mockImplementation(() => {
                throw new Error("EACCES: permission denied");
            });

            expect(() => {
                storage.save("permission-queue", { messageId: "test" });
            }).toThrow("EACCES: permission denied");

            fs.appendFileSync = originalAppendFileSync;
        });

        it("should handle disk space errors gracefully", () => {
            const originalAppendFileSync = fs.appendFileSync;
            fs.appendFileSync = jest.fn().mockImplementation(() => {
                throw new Error("ENOSPC: no space left on device");
            });

            expect(() => {
                storage.save("space-queue", { messageId: "test" });
            }).toThrow("ENOSPC: no space left on device");

            fs.appendFileSync = originalAppendFileSync;
        });

        it("should handle concurrent access gracefully", async () => {
            const message = {
                messageId: "concurrent-test",
                text: "Concurrent message",
            };

            // Simulate concurrent writes
            const promises = Array.from({ length: 10 }, (_, i) =>
                Promise.resolve().then(() =>
                    storage.save("concurrent-queue", { ...message, index: i })
                )
            );

            await Promise.all(promises);

            const loaded = storage.load("concurrent-queue");
            expect(loaded).toHaveLength(10);

            // All messages should be present
            const indices = loaded
                .map((msg) => msg.index)
                .sort((a, b) => a - b);
            expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
    });

    describe("Data Integrity", () => {
        it("should preserve message data types", () => {
            const message = {
                messageId: "types-123",
                string: "text",
                number: 42,
                boolean: true,
                null_value: null,
                undefined_value: undefined, // Will be stripped by JSON
                array: [1, 2, 3],
                object: { nested: { deep: "value" } },
                date: new Date().toISOString(),
            };

            storage.save("types-queue", message);
            const loaded = storage.load("types-queue");

            expect(loaded[0].string).toBe("text");
            expect(loaded[0].number).toBe(42);
            expect(loaded[0].boolean).toBe(true);
            expect(loaded[0].null_value).toBeNull();
            expect(loaded[0].undefined_value).toBeUndefined();
            expect(loaded[0].array).toEqual([1, 2, 3]);
            expect(loaded[0].object).toEqual({ nested: { deep: "value" } });
            expect(loaded[0].date).toBe(message.date);
        });

        it("should handle unicode characters correctly", () => {
            const message = {
                messageId: "unicode-123",
                text: "Hello 世界 🌍 café naïve résumé",
                emoji: "🚀🎉💫⭐️",
                symbols: "αβγδε ∑∏∆√∞",
                mixed: "English 中文 العربية русский 🎯",
            };

            storage.save("unicode-queue", message);
            const loaded = storage.load("unicode-queue");

            expect(loaded[0]).toEqual(message);
        });

        it("should maintain message order across save/load cycles", () => {
            const messages = Array.from({ length: 100 }, (_, i) => ({
                messageId: `order-${i}`,
                text: `Message ${i}`,
                timestamp: Date.now() + i,
            }));

            // Save all messages
            messages.forEach((msg) => storage.save("order-test-queue", msg));

            // Load and verify order
            const loaded = storage.load("order-test-queue");
            expect(loaded).toHaveLength(100);

            loaded.forEach((msg, index) => {
                expect(msg.messageId).toBe(`order-${index}`);
                expect(msg.text).toBe(`Message ${index}`);
            });
        });
    });

    describe("Edge Cases", () => {
        it("should handle queue names with special characters", () => {
            const specialQueueName = "queue-with-special-chars_123.test";
            const message = { messageId: "special-name-test" };

            storage.save(specialQueueName, message);
            const loaded = storage.load(specialQueueName);

            expect(loaded).toHaveLength(1);
            expect(loaded[0]).toEqual(message);
        });

        it("should handle very long queue names", () => {
            const longQueueName = "a".repeat(200); // 200 character queue name
            const message = { messageId: "long-name-test" };

            // This might fail on some file systems with path length limits
            try {
                storage.save(longQueueName, message);
                const loaded = storage.load(longQueueName);
                expect(loaded).toHaveLength(1);
                expect(loaded[0]).toEqual(message);
            } catch (error) {
                // If it fails due to file system limits, that's expected
                expect(error.message).toMatch(/ENAMETOOLONG|path too long/i);
            }
        });

        it("should handle messages with circular references", () => {
            const message = {
                messageId: "circular-123",
                text: "Circular reference test",
            };

            // Create circular reference
            message.self = message;

            expect(() => {
                storage.save("circular-queue", message);
            }).toThrow(); // JSON.stringify should throw on circular references
        });

        it("should handle extremely large messages", () => {
            const largeData = "x".repeat(1024 * 1024); // 1MB string
            const message = {
                messageId: "huge-123",
                largeData: largeData,
            };

            storage.save("huge-queue", message);
            const loaded = storage.load("huge-queue");

            expect(loaded).toHaveLength(1);
            expect(loaded[0].largeData).toBe(largeData);
        });
    });

    describe("Performance", () => {
        it("should handle many small messages efficiently", () => {
            const startTime = Date.now();
            const messageCount = 1000;

            // Save many small messages
            for (let i = 0; i < messageCount; i++) {
                storage.save("perf-queue", {
                    messageId: `perf-${i}`,
                    text: `Performance test message ${i}`,
                    index: i,
                });
            }

            const saveTime = Date.now() - startTime;

            // Load all messages
            const loadStartTime = Date.now();
            const loaded = storage.load("perf-queue");
            const loadTime = Date.now() - loadStartTime;

            expect(loaded).toHaveLength(messageCount);
            expect(saveTime).toBeLessThan(5000); // Should complete within 5 seconds
            expect(loadTime).toBeLessThan(1000); // Should load within 1 second

            // Verify data integrity
            loaded.forEach((msg, index) => {
                expect(msg.messageId).toBe(`perf-${index}`);
                expect(msg.index).toBe(index);
            });
        });
    });
});
