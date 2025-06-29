import Queue from "../../src/broker/queue";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

describe("Queue", () => {
    let storage;
    let queue;
    const queueName = "testqueue";

    beforeEach(() => {
        storage = {
            save: jest.fn(),
            load: jest.fn(() => []),
        };
        queue = new Queue(queueName, storage);
    });

    it("should initialize with name and storage", () => {
        expect(queue.name).toBe(queueName);
        expect(queue.storage).toBe(storage);
        expect(queue.subscribers).toEqual([]);
        expect(queue.messages).toEqual([]);
    });

    it("should publish message, save it, and notify subscribers", () => {
        const callback = jest.fn();
        queue.subscribe(callback);
        const msg = { foo: "bar" };
        queue.publish(msg);
        expect(storage.save).toHaveBeenCalledWith(queueName, msg);
        expect(queue.messages).toContain(msg);
        expect(callback).toHaveBeenCalledWith(msg);
    });

    it("should allow multiple subscribers and notify all", () => {
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        queue.subscribe(cb1);
        queue.subscribe(cb2);
        const msg = { test: 1 };
        queue.publish(msg);
        expect(cb1).toHaveBeenCalledWith(msg);
        expect(cb2).toHaveBeenCalledWith(msg);
    });
});
