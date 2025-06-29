import fs from "fs";
import path from "path";
import FileStorage from "../../src/broker/storage";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

describe("FileStorage", () => {
    const testDir = "./test-queues";
    const queueName = "testqueue";
    const filePath = path.join(testDir, `${queueName}.jsonl`);
    let storage;

    beforeEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        storage = new FileStorage(testDir);
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it("should create directory if not exists", () => {
        expect(fs.existsSync(testDir)).toBe(true);
    });

    it("should save and load messages", () => {
        const msg1 = { foo: "bar" };
        const msg2 = { hello: "world" };
        storage.save(queueName, msg1);
        storage.save(queueName, msg2);
        const loaded = storage.load(queueName);
        expect(loaded).toEqual([msg1, msg2]);
    });

    it("should return empty array if file does not exist", () => {
        expect(storage.load("nonexistent")).toEqual([]);
    });
});
