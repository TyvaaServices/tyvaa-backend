import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";

const mockBrokerChannel = {
    assertQueue: jest.fn().mockResolvedValue(undefined),
    sendToQueue: jest.fn(),
    publish: jest.fn(),
    consume: jest.fn().mockResolvedValue({ consumerTag: "mock-consumer-tag" }),
    ack: jest.fn(),
    nack: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
    purgeQueue: jest.fn().mockResolvedValue({ messageCount: 0 }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
};
const mockBrokerConnection = {
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
};
const mockGetChannel = jest.fn().mockResolvedValue(mockBrokerChannel);
const mockGetConnection = jest.fn().mockResolvedValue(mockBrokerConnection);
const mockCloseConnection = jest.fn().mockResolvedValue(undefined);

// Corrected path to use the alias defined in jsconfig.json
jest.unstable_mockModule("#broker/rabbitmqConnector.js", () => ({
    getChannel: mockGetChannel,
    getConnection: mockGetConnection,
    closeConnection: mockCloseConnection,
}));

// Mock logger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
jest.unstable_mockModule("#utils/logger.js", () => ({
    default: jest.fn(() => mockLogger),
}));

// Mock amqplib to prevent real RabbitMQ connections
jest.unstable_mockModule("amqplib", () => ({
    connect: jest.fn().mockResolvedValue({
        createChannel: jest.fn().mockResolvedValue({
            assertQueue: jest.fn().mockResolvedValue(undefined),
            sendToQueue: jest.fn(),
            publish: jest.fn(),
            consume: jest
                .fn()
                .mockResolvedValue({ consumerTag: "mock-consumer-tag" }),
            ack: jest.fn(),
            nack: jest.fn(),
            cancel: jest.fn().mockResolvedValue(undefined),
            purgeQueue: jest.fn().mockResolvedValue({ messageCount: 0 }),
            close: jest.fn().mockResolvedValue(undefined),
            on: jest.fn(),
        }),
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
    }),
}));

// Dynamically import the module to be tested
let BrokerModule;
let broker;

describe("Broker (RabbitMQ)", () => {
    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();

        // Use the alias for dynamic import
        BrokerModule = await import("#broker/broker.js");
        // Default export is an object with getInstance and BrokerClass
        broker = BrokerModule.default.getInstance();
        // Ensure a clean instance for each test if getInstance is a true singleton that persists state
        // For this test structure, we might want to test BrokerClass directly for isolation
        // broker = new BrokerModule.BrokerClass();

        // Spy on the emit method of the specific broker instance for each test
        jest.spyOn(broker, 'emit');
    });

    afterEach(async () => {
        if (broker && typeof broker.destroy === "function") {
            await broker.destroy();
        }
        // Restore the spy after each test
        if (broker && broker.emit.mockRestore) {
            broker.emit.mockRestore();
        }
    });

    describe("Connection", () => {
        it("should connect and get channel on connect()", async () => {
            await broker.connect();
            expect(mockGetChannel).toHaveBeenCalled();
            expect(broker.getChannelInstance()).toBe(mockBrokerChannel);
            expect(broker.getConnectionInstance()).toBe(mockBrokerConnection);
            expect(broker.emit).toHaveBeenCalledWith("connected");
        });

        it("should emit error if connect fails", async () => {
            mockGetChannel.mockRejectedValueOnce(
                new Error("Connection failed")
            );
            await expect(broker.connect()).rejects.toThrow("Connection failed");
            expect(broker.emit).toHaveBeenCalledWith("error", expect.any(Error));
        });
    });

    describe("assertQueue", () => {
        it("should call channel.assertQueue", async () => {
            await broker.connect(); // Ensure channel is set
            await broker.assertQueue("test-queue", { durable: false });
            expect(mockBrokerChannel.assertQueue).toHaveBeenCalledWith(
                "test-queue",
                { durable: false }
            );
        });

        it("should attempt to connect if channel not available", async () => {
            // broker.channel is null initially
            await broker.assertQueue("test-queue");
            expect(mockGetChannel).toHaveBeenCalled(); // connect was called
            expect(mockBrokerChannel.assertQueue).toHaveBeenCalledWith(
                "test-queue",
                { durable: true }
            );
        });
    });

    describe("Publishing", () => {
        beforeEach(async () => {
            await broker.connect(); // Ensure channel is available
        });

        it("sendToQueue should assert queue and send message", async () => {
            const queueName = "my-queue";
            const message = { data: "test" };
            await broker.sendToQueue(queueName, message);
            expect(mockBrokerChannel.assertQueue).toHaveBeenCalledWith(
                queueName,
                { durable: true }
            );
            expect(mockBrokerChannel.sendToQueue).toHaveBeenCalledWith(
                queueName,
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );
            expect(broker.emit).toHaveBeenCalledWith("message-published", {
                queueName,
                msg: message,
            });
        });

        it("publish should call channel.publish", async () => {
            const exchange = "my-exchange";
            const routingKey = "my-key";
            const message = { data: "test" };
            await broker.publish(exchange, routingKey, message);
            expect(mockBrokerChannel.publish).toHaveBeenCalledWith(
                exchange,
                routingKey,
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );
            expect(broker.emit).toHaveBeenCalledWith("message-published", {
                exchangeName: exchange,
                routingKey,
                msg: message,
            });
        });

        it("publish should use empty string for default exchange if exchangeName is null", async () => {
            const queueName = "direct-queue";
            const message = { data: "direct" };
            await broker.publish(null, queueName, message);
            expect(mockBrokerChannel.publish).toHaveBeenCalledWith(
                "", // Default exchange
                queueName, // Routing key is queue name
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );
        });

        it("should throw error if trying to publish when not connected", async () => {
            await broker.destroy();
            broker.channel = null;

            // Configure rabbitmqConnector.getChannel (mockGetChannel) to fail for this specific test scenario
            mockGetChannel.mockRejectedValueOnce(new Error("Simulated underlying connection failure"));

            // sendToQueue will call this.connect(), which will fail due to mockGetChannel rejecting.
            // The error from this.connect() (which is "Simulated underlying connection failure") will propagate.
            await expect(broker.sendToQueue("q", {})).rejects.toThrow(
                "Simulated underlying connection failure"
            );
            // Ensure mockGetChannel is reset for subsequent tests if needed, though beforeEach should handle it.
             mockGetChannel.mockResolvedValue(mockBrokerChannel); // Reset to default behavior
        });
    });

    describe("Subscription", () => {
        beforeEach(async () => {
            await broker.connect();
        });

        it("subscribe should assert queue and consume messages", async () => {
            const queueName = "sub-queue";
            const callback = jest.fn();
            const consumerTag = await broker.subscribe(queueName, callback);

            expect(mockBrokerChannel.assertQueue).toHaveBeenCalledWith(
                queueName,
                { durable: true }
            );
            expect(mockBrokerChannel.consume).toHaveBeenCalledWith(
                queueName,
                expect.any(Function),
                { noAck: false }
            );
            expect(consumerTag).toBe("mock-consumer-tag");
            expect(broker.emit).toHaveBeenCalledWith("subscribed", {
                queueName,
                consumerTag,
            });

            // Simulate a message
            const consumeCallback = mockBrokerChannel.consume.mock.calls[0][1];
            const mockMsg = {
                content: Buffer.from(JSON.stringify({ data: "hello" })),
                properties: { messageId: "123" },
            };
            await consumeCallback(mockMsg);
            expect(callback).toHaveBeenCalledWith({ data: "hello" }, mockMsg);
        });

        it("subscribe callback should nack unparseable message", async () => {
            const queueName = "sub-queue-unparseable";
            const callback = jest.fn();
            await broker.subscribe(queueName, callback, { noAck: false });

            const consumeCallback = mockBrokerChannel.consume.mock.calls[0][1];
            const mockInvalidMsg = {
                content: Buffer.from("not-json"),
                properties: { messageId: "456" },
            };
            await consumeCallback(mockInvalidMsg);
            expect(callback).not.toHaveBeenCalled();
            expect(mockBrokerChannel.nack).toHaveBeenCalledWith(
                mockInvalidMsg,
                false,
                false
            );
        });

        it("unsubscribe should cancel consumer", async () => {
            const consumerTag = "mock-consumer-tag";
            broker.consumers.set(consumerTag, "some-queue"); // Manually add for test

            await broker.unsubscribe(consumerTag);
            expect(mockBrokerChannel.cancel).toHaveBeenCalledWith(consumerTag);
            expect(broker.consumers.has(consumerTag)).toBe(false);
            expect(broker.emit).toHaveBeenCalledWith("unsubscribed", {
                consumerTag,
                queueName: "some-queue",
            });
        });
    });

    describe("Acknowledgement", () => {
        const mockAmqpMessage = { properties: { messageId: "test-msg-id" } };
        beforeEach(async () => {
            await broker.connect();
        });

        it("acknowledge should call channel.ack", () => {
            broker.acknowledge(mockAmqpMessage);
            expect(mockBrokerChannel.ack).toHaveBeenCalledWith(mockAmqpMessage);
            expect(broker.emit).toHaveBeenCalledWith("message-acknowledged", {
                messageId: "test-msg-id",
            });
        });

        it("nack should call channel.nack", () => {
            broker.nack(mockAmqpMessage, false, true);
            expect(mockBrokerChannel.nack).toHaveBeenCalledWith(
                mockAmqpMessage,
                false,
                true
            );
            expect(broker.emit).toHaveBeenCalledWith("message-nacked", {
                messageId: "test-msg-id",
                requeue: true,
            });
        });
    });

    describe("Purge Queue", () => {
        beforeEach(async () => {
            await broker.connect();
        });
        it("purgeQueue should call channel.purgeQueue", async () => {
            const queueName = "purge-me";
            mockBrokerChannel.purgeQueue.mockResolvedValueOnce({
                messageCount: 10,
            });
            const result = await broker.purgeQueue(queueName);
            expect(mockBrokerChannel.purgeQueue).toHaveBeenCalledWith(
                queueName
            );
            expect(result.messageCount).toBe(10);
            expect(broker.emit).toHaveBeenCalledWith("queue-purged", {
                queueName,
                messageCount: 10,
            });
        });
    });

    describe("Destroy", () => {
        it("should close connection and clear listeners", async () => {
            await broker.connect(); // ensure connection exists
            // Simulate an active consumer
            const consumerTag = "test-destroy-consumer";
            broker.consumers.set(consumerTag, "destroy-queue");
            mockBrokerChannel.cancel.mockClear(); // Clear any previous cancel calls

            await broker.destroy();

            expect(mockBrokerChannel.cancel).toHaveBeenCalledWith(consumerTag); // Check if unsubscribe was called for active consumers
            expect(mockCloseConnection).toHaveBeenCalled();
            expect(broker.getChannelInstance()).toBeNull();
            expect(broker.listenerCount("connected")).toBe(0); // Example of checking listeners
        });
    });
});

// Removed the custom toHaveEmitted matcher as direct jest.spyOn(broker, 'emit') is used.
