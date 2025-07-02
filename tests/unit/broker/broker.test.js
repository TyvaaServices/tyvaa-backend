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
    connection: {}, // Ensure this object exists for the check in rabbitmqConnector
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
    debug: jest.fn(), // Added debug for completeness if used
};
jest.unstable_mockModule("#utils/logger.js", () => ({
    default: jest.fn(() => mockLogger),
}));

// Mock amqplib to prevent real RabbitMQ connections
// This mock might be less critical if #broker/rabbitmqConnector.js is fully mocked,
// but good to have for direct BrokerClass instantiation if that's ever done without full connector mock.
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
let broker; // This will be the primary instance from getInstance()
let BrokerClass; // To allow direct instantiation for some tests if needed

describe("Broker (RabbitMQ)", () => {
    beforeEach(async () => {
        jest.resetModules(); // Resets module cache
        jest.clearAllMocks(); // Clears all mock function calls and instances

        // Ensure rabbitmqConnector mocks are reset to default behaviors
        mockGetChannel.mockResolvedValue(mockBrokerChannel);
        mockGetConnection.mockResolvedValue(mockBrokerConnection);
        mockCloseConnection.mockResolvedValue(undefined);
        mockBrokerChannel.assertQueue.mockResolvedValue(undefined);
        mockBrokerChannel.sendToQueue.mockReset();
        mockBrokerChannel.publish.mockReset();
        mockBrokerChannel.consume.mockResolvedValue({ consumerTag: "mock-consumer-tag" });
        mockBrokerChannel.ack.mockReset();
        mockBrokerChannel.nack.mockReset();
        mockBrokerChannel.cancel.mockResolvedValue(undefined);
        mockBrokerChannel.purgeQueue.mockResolvedValue({ messageCount: 0 });
        mockBrokerChannel.close.mockResolvedValue(undefined);
        mockBrokerChannel.on.mockReset();
        mockBrokerConnection.on.mockReset();
        mockBrokerConnection.close.mockResolvedValue(undefined);


        BrokerModule = await import("#broker/broker.js");
        // Correctly access BrokerClass from the default export's property
        BrokerClass = BrokerModule.default.BrokerClass; 

        // jest.resetModules() in the main beforeEach ensures brokerInstance inside the module is initially null.
        // The first call to getInstance() will create the singleton.
        broker = BrokerModule.default.getInstance({ testConfig: true }); // This is now the singleton for this test file run.

        jest.spyOn(broker, "emit"); 
    });

    afterEach(async () => {
        if (broker && typeof broker.destroy === "function") {
            await broker.destroy().catch(err => mockLogger.error("Error during afterEach destroy:", err));
        }
         if (broker && broker.emit && broker.emit.mockRestore) {
            broker.emit.mockRestore();
        }
        // No need to manually reset BrokerModule.default.brokerInstance here, 
        // jest.resetModules() in the main beforeEach handles it for the next test file.
    });

    describe("Constructor and Singleton", () => {
        // For these tests, we instantiate BrokerClass directly, not via getInstance,
        // to separate testing of constructor logic from singleton logic.
        it("BrokerClass should initialize with default config if none provided", () => {
            const newBroker = new BrokerClass(); // Direct instantiation
            expect(newBroker.config).toEqual({});
            expect(newBroker.channel).toBeNull();
            expect(newBroker.connection).toBeNull();
            expect(newBroker.consumers).toBeInstanceOf(Map);
        });

        it("BrokerClass should use provided config", () => {
            const config = { customSetting: "value" };
            const newBroker = new BrokerClass(config); // Direct instantiation
            expect(newBroker.config).toEqual(config);
        });

        // Tests for getInstance behavior (singleton)
        // These rely on the `broker` instance created in the outer beforeEach,
        // which is the result of the first getInstance call after module reset.
        it("getInstance should return the same instance (already created in beforeEach)", () => {
            const instance1 = broker; // This is the instance from beforeEach
            const instance2 = BrokerModule.default.getInstance({ new: "config" }); // Config is ignored
            expect(instance1).toBe(instance2);
            // It should have the config used in beforeEach
            expect(instance1.config).toEqual({ testConfig: true }); 
        });

        it("getInstance (called first time in a fresh module context) should create a new instance with config", async () => {
            // This test needs a truly fresh module context to test initial creation.
            jest.resetModules(); // Reset modules specifically for this test
            const FreshBrokerModule = await import("#broker/broker.js");
            const config = { specific: "setting" };
            const instance = FreshBrokerModule.default.getInstance(config);
            
            expect(instance).toBeInstanceOf(FreshBrokerModule.default.BrokerClass);
            expect(instance.config).toEqual(config);
            // Clean up this instance if it's not cleaned by global afterEach logic
            if (instance && typeof instance.destroy === 'function') {
                await instance.destroy();
            }
        });
    });


    describe("Connection", () => {
        it("should connect, get channel and connection on connect()", async () => {
            await broker.connect();
            expect(mockGetChannel).toHaveBeenCalledTimes(1);
            expect(mockGetConnection).toHaveBeenCalledTimes(1);
            expect(broker.getChannelInstance()).toBe(mockBrokerChannel);
            expect(broker.getConnectionInstance()).toBe(mockBrokerConnection);
            expect(broker.emit).toHaveBeenCalledWith("connected");
            expect(mockBrokerConnection.on).toHaveBeenCalledWith("error", expect.any(Function));
            expect(mockBrokerConnection.on).toHaveBeenCalledWith("close", expect.any(Function));
        });

        it("should emit 'error' and nullify channel when connection emits 'error'", async () => {
            // Add a temporary error listener to the broker for this test to catch the emitted error
            // and prevent Jest from flagging it as an unhandled rejection/error.
            const tempErrorListener = jest.fn();
            broker.on('error', tempErrorListener);

            await broker.connect(); // Establish connection and setup listeners

            const errorHandler = mockBrokerConnection.on.mock.calls.find(call => call[0] === 'error')[1];
            const testError = new Error("RabbitMQ connection died");
            
            errorHandler(testError); // Simulate connection emitting an error

            expect(broker.emit).toHaveBeenCalledWith("error", testError);
            expect(tempErrorListener).toHaveBeenCalledWith(testError); // Verify our listener caught it
            expect(broker.getChannelInstance()).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith("Broker: RabbitMQ connection error:", "RabbitMQ connection died");

            broker.removeListener('error', tempErrorListener); // Clean up
        });

        it("should emit 'close' and nullify channel when connection emits 'close'", async () => {
            await broker.connect(); // Establish connection and setup listeners

            // Find the close handler passed to connection.on('close', handler)
            const closeHandler = mockBrokerConnection.on.mock.calls.find(call => call[0] === 'close')[1];
            closeHandler(); // Simulate connection emitting a close event

            expect(broker.emit).toHaveBeenCalledWith("close");
            expect(broker.getChannelInstance()).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith("Broker: RabbitMQ connection closed.");
        });


        it("should emit error if connect fails (getChannel rejects)", async () => {
            mockGetChannel.mockRejectedValueOnce(
                new Error("Connection failed")
            );
            await expect(broker.connect()).rejects.toThrow("Connection failed");
            expect(broker.emit).toHaveBeenCalledWith("error", expect.any(Error));
        });

         it("should emit error if connect fails (getConnection rejects)", async () => {
            mockGetConnection.mockRejectedValueOnce(new Error("Connection failed to get actual connection"));
            // mockGetChannel might still resolve, but getConnection fails
            await expect(broker.connect()).rejects.toThrow("Connection failed to get actual connection");
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

        it("should emit error and rethrow if assertQueue fails", async () => {
            // broker.channel is null initially, so assertQueue will call connect()
            const queueError = new Error("Failed to assert");
            // Ensure the channel's assertQueue method (which will be called after internal connect) fails
            mockBrokerChannel.assertQueue.mockRejectedValueOnce(queueError); 
            
            await expect(broker.assertQueue("fail-queue")).rejects.toThrow("Failed to assert"); 
            expect(broker.emit).toHaveBeenCalledWith("error", queueError); 
            
            // Reset mock for subsequent tests if it's stateful, though mockRejectedValueOnce is usually self-contained.
            // mockBrokerChannel.assertQueue.mockResolvedValue(undefined); // Or whatever its default success is
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
            mockGetChannel.mockRejectedValueOnce(
                new Error("Simulated underlying connection failure")
            );

            // sendToQueue will call this.connect(), which will fail due to mockGetChannel rejecting.
            // The error from this.connect() (which is "Simulated underlying connection failure") will propagate.
            await expect(broker.sendToQueue("q", {})).rejects.toThrow(
                "Simulated underlying connection failure"
            );
            // Ensure mockGetChannel is reset for subsequent tests if needed, though beforeEach should handle it.
            mockGetChannel.mockResolvedValue(mockBrokerChannel); // Reset to default behavior
        });

        it("publish should throw if connect resolves but channel is still null (highly defensive)", async () => {
            // This test needs the broker to be in a state where channel is not set before calling publish
            const freshBroker = new BrokerClass(); // Use a fresh instance, not the one from global beforeEach
            jest.spyOn(freshBroker, "emit");
            
            mockGetChannel.mockResolvedValueOnce(null); // Simulate getChannel resolving to null

            await expect(freshBroker.publish("exch", "rk", {})).rejects.toThrow(
                "Broker not connected after attempting to connect. Cannot publish message."
            );
            expect(freshBroker.emit).toHaveBeenCalledWith("error", expect.any(Error));
            
            if (freshBroker.emit.mockRestore) freshBroker.emit.mockRestore();
            await freshBroker.destroy(); // Clean up this specific instance
             // Reset mock for other tests that might use the global broker instance
            mockGetChannel.mockResolvedValue(mockBrokerChannel);
        });
        
        it("sendToQueue should throw if connect resolves but channel is still null (highly defensive)", async () => {
            const freshBroker = new BrokerClass();
            jest.spyOn(freshBroker, "emit");
            mockGetChannel.mockResolvedValueOnce(null); 

            await expect(freshBroker.sendToQueue("q", {})).rejects.toThrow(
                "Broker not connected after attempting to connect. Cannot send to queue."
            );
            expect(freshBroker.emit).toHaveBeenCalledWith("error", expect.any(Error));

            if (freshBroker.emit.mockRestore) freshBroker.emit.mockRestore();
            await freshBroker.destroy();
            mockGetChannel.mockResolvedValue(mockBrokerChannel);
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

        it("subscribe should throw if connect resolves but channel is still null (highly defensive)", async () => {
            const freshBroker = new BrokerClass();
            jest.spyOn(freshBroker, "emit");
            mockGetChannel.mockResolvedValueOnce(null);

            await expect(freshBroker.subscribe("q", async () => {})).rejects.toThrow(
                "Broker not connected after attempting to connect. Cannot subscribe."
            );
            expect(freshBroker.emit).toHaveBeenCalledWith("error", expect.any(Error));
            
            if (freshBroker.emit.mockRestore) freshBroker.emit.mockRestore();
            await freshBroker.destroy();
            mockGetChannel.mockResolvedValue(mockBrokerChannel);
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

        it("purgeQueue should throw if connect resolves but channel is still null (highly defensive)", async () => {
            const freshBroker = new BrokerClass();
            jest.spyOn(freshBroker, "emit");
            mockGetChannel.mockResolvedValueOnce(null);

            await expect(freshBroker.purgeQueue("q")).rejects.toThrow(
                "Broker not connected after attempting to connect. Cannot purge queue."
            );
            expect(freshBroker.emit).toHaveBeenCalledWith("error", expect.any(Error));

            if (freshBroker.emit.mockRestore) freshBroker.emit.mockRestore();
            await freshBroker.destroy();
            mockGetChannel.mockResolvedValue(mockBrokerChannel);
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