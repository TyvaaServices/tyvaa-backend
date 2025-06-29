import Broker from "../../src/broker/broker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

describe("Broker", () => {
    beforeEach(() => {
        // Clear queues and storage for isolation
        Broker.queues = {};
        if (
            Broker.storage &&
            Broker.storage.dir &&
            Broker.storage.dir.startsWith("./queues")
        ) {
            // Optionally clean up test queues if needed
        }
    });

    it("should create and return a queue", () => {
        const queue = Broker.getQueue("myqueue");
        expect(queue).toBeDefined();
        expect(Broker.getQueue("myqueue")).toBe(queue); // should be singleton per name
    });

    it("should publish message to the correct queue", () => {
        const queue = Broker.getQueue("pubqueue");
        queue.publish = jest.fn();
        Broker.queues["pubqueue"] = queue;
        Broker.publish("pubqueue", { foo: "bar" });
        expect(queue.publish).toHaveBeenCalledWith({ foo: "bar" });
    });

    it("should subscribe to the correct queue", () => {
        const queue = Broker.getQueue("subqueue");
        queue.subscribe = jest.fn();
        Broker.queues["subqueue"] = queue;
        const cb = jest.fn();
        Broker.subscribe("subqueue", cb);
        expect(queue.subscribe).toHaveBeenCalledWith(cb);
    });
});
