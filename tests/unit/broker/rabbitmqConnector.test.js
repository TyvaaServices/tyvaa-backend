import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";

// Define mocks for amqplib connection and channel behavior
const mockChannel = {
    assertQueue: jest.fn().mockResolvedValue({ queue: "test-queue" }),
    sendToQueue: jest.fn(),
    publish: jest.fn(),
    consume: jest.fn().mockResolvedValue({ consumerTag: "test-consumer-tag" }),
    ack: jest.fn(),
    nack: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnThis(),
    prefetch: jest.fn().mockResolvedValue(undefined),
};
const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn().mockResolvedValue(undefined),
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnThis(), // <--- Ensure 'on' is a jest.fn()
    connection: {}, 
};
// This single mock function will be manipulated by tests.
const mockAmqpConnect = jest.fn();

jest.unstable_mockModule("amqplib", () => ({
    default: { connect: mockAmqpConnect },
    connect: mockAmqpConnect,
}));

// Mock logger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};
jest.unstable_mockModule("#utils/logger.js", () => ({
    default: jest.fn(() => mockLogger),
}));

let mockProcessOn;
let mockProcessExit;

let rabbitmqConnector;
let setTimeoutSpy;

// Helper function to re-import the connector, allowing mocks to be effective
// and resetting its internal state.
async function importConnector() {
    // jest.resetModules() should be called before this if a truly fresh import is needed for module-level state
    const connectorModule = await import("../../../src/broker/rabbitmqConnector.js");
    // Allow resetting internal state for tests if such a method is exposed (test-only)
    // This would be for state not reset by jest.resetModules (e.g. if it's not module-scoped let/const)
    // However, our `connection` and `channel` are module-scoped, so resetModules is key.
    return connectorModule;
}


describe("RabbitMQ Connector", () => {
    beforeEach(async () => {
        jest.resetModules(); // This is key to get a fresh module state for rabbitmqConnector.js
        jest.clearAllMocks(); // Clears calls and instances of mocks

        process.env.RABBITMQ_URL = "amqp://testhost";

        // Default successful connection behavior for amqplib mocks
        mockAmqpConnect.mockResolvedValue(mockConnection);
        mockConnection.createChannel.mockResolvedValue(mockChannel);
        mockConnection.on.mockReturnThis(); 
        mockChannel.on.mockReturnThis();    
        mockChannel.close.mockResolvedValue(undefined);
        mockConnection.close.mockResolvedValue(undefined);

        // Setup spies here, AFTER jest.clearAllMocks() and BEFORE module import
        mockProcessOn = jest.spyOn(process, "on");
        mockProcessExit = jest.spyOn(process, "exit").mockImplementation((code) => undefined); // Keep original mockImplementation

        // Import the connector for each test to ensure clean state due to jest.resetModules()
        rabbitmqConnector = await import("../../../src/broker/rabbitmqConnector.js");


        setTimeoutSpy = jest
            .spyOn(global, "setTimeout")
            .mockImplementation((callback) => {
                Promise.resolve().then(() => {
                    if (typeof callback === "function") {
                        callback();
                    }
                });
                return { hasRef: () => false, ref: () => {}, unref: () => {} };
            });
    });

    afterEach(async () => {
        // It's crucial to ensure the module's internal state (connection, channel)
        // is cleaned up. jest.resetModules() in beforeEach is the primary way.
        // Explicitly closing connection here helps if a test established one and didn't clean up.
        if (rabbitmqConnector && typeof rabbitmqConnector.closeConnection === 'function') {
            await rabbitmqConnector.closeConnection().catch(() => {});
        }

        delete process.env.RABBITMQ_URL;
        if (setTimeoutSpy) setTimeoutSpy.mockRestore();
        // mockAmqpConnect is cleared by clearAllMocks, but explicit reset can be safer for default behavior
        mockAmqpConnect.mockReset();
    });

    describe("Configuration and URL Handling", () => {
        it("getChannel should throw if RABBITMQ_URL is not set", async () => {
            delete process.env.RABBITMQ_URL;
            // Re-import connector after changing env var, as it's read at runtime by the functions
            const freshConnector = await importConnector();
            await expect(freshConnector.getChannel()).rejects.toThrow(
                "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
            );
        });

        it("getConnection should throw if RABBITMQ_URL is not set", async () => {
            delete process.env.RABBITMQ_URL;
            const freshConnector = await importConnector();
            await expect(freshConnector.getConnection()).rejects.toThrow(
                "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
            );
        });

        it("connectWithRetry (via getChannel) should reject if RABBITMQ_URL is not set", async () => {
            delete process.env.RABBITMQ_URL;
            // jest.resetModules() in beforeEach will ensure the module re-evaluates.
            // Then importConnector will get this fresh version.
            const freshConnector = await importConnector();
            await expect(freshConnector.getChannel()).rejects.toThrow(
                "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
            );
            expect(mockAmqpConnect).not.toHaveBeenCalled();
        });
    });


    describe("getChannel", () => {
        it("should connect and return a channel if not connected", async () => {
            const channel = await rabbitmqConnector.getChannel();
            expect(mockAmqpConnect).toHaveBeenCalledWith("amqp://testhost");
            expect(mockConnection.createChannel).toHaveBeenCalled();
            expect(channel).toBe(mockChannel);
        });

        it("should return existing channel if already connected", async () => {
            await rabbitmqConnector.getChannel(); 
            mockAmqpConnect.mockClear();
            mockConnection.createChannel.mockClear();

            const channel = await rabbitmqConnector.getChannel(); 
            expect(mockAmqpConnect).not.toHaveBeenCalled();
            expect(mockConnection.createChannel).not.toHaveBeenCalled();
            expect(channel).toBe(mockChannel);
        });

        it("should retry connection on failure (success on 3rd attempt)", async () => {
            mockAmqpConnect
                .mockRejectedValueOnce(new Error("Connection failed 1"))
                .mockRejectedValueOnce(new Error("Connection failed 2"))
                .mockResolvedValueOnce(mockConnection); 

            // rabbitmqConnector is already fresh due to beforeEach
            const channel = await rabbitmqConnector.getChannel();

            expect(mockAmqpConnect).toHaveBeenCalledTimes(3);
            expect(setTimeoutSpy).toHaveBeenCalledTimes(2); 
            expect(channel).toBe(mockChannel);
        });

        it("should throw error after MAX_RETRIES (10) failures", async () => {
            mockAmqpConnect.mockRejectedValue(new Error("Persistent connection error"));
            
            await expect(rabbitmqConnector.getChannel()).rejects.toThrow("Persistent connection error");
            expect(mockAmqpConnect).toHaveBeenCalledTimes(10); 
            expect(setTimeoutSpy).toHaveBeenCalledTimes(9); 
        });
    });

    describe("getConnection", () => {
        it("should connect and return a connection if not connected", async () => {
            const connection = await rabbitmqConnector.getConnection();
            expect(mockAmqpConnect).toHaveBeenCalledWith("amqp://testhost");
            expect(connection).toBe(mockConnection);
        });

        it("should return existing connection if already connected", async () => {
            await rabbitmqConnector.getConnection(); 
            mockAmqpConnect.mockClear();

            const connection = await rabbitmqConnector.getConnection(); 
            expect(mockAmqpConnect).not.toHaveBeenCalled();
            expect(connection).toBe(mockConnection);
        });
    });

    describe("Connection and Channel Event Handlers", () => {
        let connectionErrorHandler;
        let connectionCloseHandler;
        let channelErrorHandler;
        let channelCloseHandler;

        beforeEach(async () => {
            // Capture the handlers by re-assigning them from the mock's calls
            mockConnection.on.mockImplementation((event, handler) => {
                if (event === "error") connectionErrorHandler = handler;
                if (event === "close") connectionCloseHandler = handler;
                return mockConnection;
            });
            mockChannel.on.mockImplementation((event, handler) => {
                if (event === "error") channelErrorHandler = handler;
                if (event === "close") channelCloseHandler = handler;
                return mockChannel;
            });
            // Establish connection to ensure handlers are registered by the connector
            await rabbitmqConnector.getChannel(); 
        });

        it("should log error and nullify connection/channel on connection 'error' event", async () => {
            const err = new Error("Connection test error");
            if(connectionErrorHandler) connectionErrorHandler(err);
            expect(mockLogger.error).toHaveBeenCalledWith("RabbitMQ connection error:", err);
            
            // Verify state by trying to get channel again - should attempt to reconnect
            mockAmqpConnect.mockClear(); // Clear previous connect call
            mockAmqpConnect.mockResolvedValue(mockConnection); // Make next connect succeed
            await rabbitmqConnector.getChannel();
            expect(mockAmqpConnect).toHaveBeenCalledTimes(1); // Proves it tried to reconnect
        });

        it("should log warning and nullify connection/channel on connection 'close' event", async () => {
            if(connectionCloseHandler) connectionCloseHandler();
            expect(mockLogger.warn).toHaveBeenCalledWith("RabbitMQ connection closed.");
            mockAmqpConnect.mockClear();
            mockAmqpConnect.mockResolvedValue(mockConnection);
            await rabbitmqConnector.getChannel();
            expect(mockAmqpConnect).toHaveBeenCalledTimes(1);
        });

        it("should log error and nullify channel on channel 'error' event", async () => {
            const err = new Error("Channel test error");
            if(channelErrorHandler) channelErrorHandler(err);
            expect(mockLogger.error).toHaveBeenCalledWith("RabbitMQ channel error:", err);
            
            // Verify state by trying to get channel again - should attempt to recreate channel (or full connect)
            mockConnection.createChannel.mockClear(); // Clear previous createChannel call
            mockConnection.createChannel.mockResolvedValue(mockChannel); // Make next createChannel succeed
            await rabbitmqConnector.getChannel();
            // Depending on logic, it might recreate channel or full connection.
            // If full connection:
            // expect(mockAmqpConnect).toHaveBeenCalledTimes(1);
            // If just channel:
            expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
        });

        it("should log warning and nullify channel on channel 'close' event", async () => {
            if(channelCloseHandler) channelCloseHandler();
            expect(mockLogger.warn).toHaveBeenCalledWith("RabbitMQ channel closed.");
            mockConnection.createChannel.mockClear();
            mockConnection.createChannel.mockResolvedValue(mockChannel);
            await rabbitmqConnector.getChannel();
            expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
        });
    });


    describe("closeConnection", () => {
        it("should close channel and connection if they exist", async () => {
            await rabbitmqConnector.getChannel(); 
            mockChannel.close.mockClear();
            mockConnection.close.mockClear();

            await rabbitmqConnector.closeConnection();

            expect(mockChannel.close).toHaveBeenCalledTimes(1);
            expect(mockConnection.close).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).toHaveBeenCalledWith("RabbitMQ channel closed.");
            expect(mockLogger.info).toHaveBeenCalledWith("RabbitMQ connection closed.");
        });

        it("should handle closing when not connected without error", async () => {
            // Connector is fresh from beforeEach, no connection made in this test path yet
            await expect(rabbitmqConnector.closeConnection()).resolves.toBeUndefined();
            expect(mockChannel.close).not.toHaveBeenCalled();
            expect(mockConnection.close).not.toHaveBeenCalled();
        });

        it("should log error if channel.close() fails", async () => {
            await rabbitmqConnector.getChannel(); 
            const closeError = new Error("Channel close failed");
            mockChannel.close.mockRejectedValueOnce(closeError);

            await rabbitmqConnector.closeConnection();
            expect(mockLogger.error).toHaveBeenCalledWith("Error closing RabbitMQ channel:", closeError);
            expect(mockConnection.close).toHaveBeenCalledTimes(1); 
        });

        it("should log error if connection.close() fails", async () => {
            await rabbitmqConnector.getChannel(); 
            const closeError = new Error("Connection close failed");
            mockConnection.close.mockRejectedValueOnce(closeError);

            await rabbitmqConnector.closeConnection();
            expect(mockLogger.error).toHaveBeenCalledWith("Error closing RabbitMQ connection:", closeError);
            expect(mockChannel.close).toHaveBeenCalledTimes(1); 
        });
    });

    describe("isConnecting flag / Concurrent connections", () => {
        it("should wait for existing connection attempt if isConnecting is true", async () => {
            let firstCallResolve;
            mockAmqpConnect.mockImplementationOnce(() => { // Only for the first actual connection attempt
                return new Promise(resolve => { firstCallResolve = () => resolve(mockConnection); });
            });
            
            // rabbitmqConnector is fresh from beforeEach
            const firstPromise = rabbitmqConnector.getChannel(); // This will use the mock above and pause
            const secondPromise = rabbitmqConnector.getChannel(); // This should hit the isConnecting logic

            expect(mockLogger.info).toHaveBeenCalledWith("Connection attempt already in progress, awaiting existing attempt.");
            
            if(firstCallResolve) firstCallResolve(); // Resolve the first pending connection

            const [channel1, channel2] = await Promise.all([firstPromise, secondPromise]);

            expect(mockAmqpConnect).toHaveBeenCalledTimes(1); 
            expect(channel1).toBe(mockChannel);
            expect(channel2).toBe(mockChannel); 
        });

        it("should reject waiting connections if the primary connection attempt fails after retries", async () => {
            // Make the first connection attempt fail consistently after all retries
            mockAmqpConnect.mockRejectedValue(new Error("Persistent connection failure"));
        
            // Start the first connection attempt
            const firstPromise = rabbitmqConnector.getChannel().catch(e => e); // Catch expected error
        
            // Start the second connection attempt while the first is pending retries
            // It should wait for the first one to complete (fail in this case)
            const secondPromise = rabbitmqConnector.getChannel().catch(e => e);
        
            // Wait for both promises to settle
            const [result1, result2] = await Promise.all([firstPromise, secondPromise]);
        
            // Both should be rejected with an error
            expect(result1).toBeInstanceOf(Error);
            expect(result1.message).toBe("Persistent connection failure"); // From the max retries of 1st attempt
            
            expect(result2).toBeInstanceOf(Error);
            // This is the key: the second attempt should reject because the first one failed and didn't set up a connection
            expect(result2.message).toBe("Connection attempt finished but failed."); // This covers line 43
            
            // The first getChannel() makes MAX_RETRIES (10) calls to amqp.connect because it persistently fails.
            // The second getChannel() call initially waits due to `isConnecting` being true.
            // Once the first attempt fully fails (after 10 tries) and `isConnecting` becomes false,
            // the `checkConnection` for the second attempt will find no valid connection/channel
            // and reject without making new calls to `amqp.connect`.
            expect(mockAmqpConnect).toHaveBeenCalledTimes(10); 
            expect(mockLogger.info).toHaveBeenCalledWith("Connection attempt already in progress, awaiting existing attempt.");
        });
    });

    describe("Signal Handlers", () => {
        // Note: process.on is called at module load time.
        // jest.resetModules() in beforeEach ensures the module is reloaded,
        // so process.on will be called again for each test in this describe block (if not scoped).
        // The spies mockProcessOn and mockProcessExit are active.

        it("should register SIGINT and SIGTERM handlers upon module load", () => {
            // The import in beforeEach (which calls jest.resetModules() and then imports)
            // should cause the module-level process.on calls to occur.
        // The spy mockProcessOn (now set up in beforeEach) should capture these.
            expect(mockProcessOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
            expect(mockProcessOn).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
        });
        
        async function testSignalHandler(signalName) {
            // The module is imported in beforeEach, so handlers should be registered.
            // Find the handler function from the spy's calls.
            const call = mockProcessOn.mock.calls.find(c => c[0] === signalName);
            expect(call).toBeDefined(); 
            const handler = call[1]; 

            // Establish an active connection so closeConnection has effects to test
            mockAmqpConnect.mockResolvedValue(mockConnection); 
            mockConnection.createChannel.mockResolvedValue(mockChannel);
            await rabbitmqConnector.getChannel(); // Establish a connection

            // Clear mocks after setup and before handler invocation for precise assertions
            mockConnection.close.mockClear();
            mockChannel.close.mockClear();
            mockProcessExit.mockClear();
            mockLogger.info.mockClear(); // Clear for specific log check related to signal handling

            await handler(); 

            expect(mockLogger.info).toHaveBeenCalledWith(`${signalName} received, closing RabbitMQ connection...`);
            // Check the effects of closeConnection being called
            expect(mockConnection.close).toHaveBeenCalledTimes(1); 
            expect(mockChannel.close).toHaveBeenCalledTimes(1);   
            expect(mockProcessExit).toHaveBeenCalledWith(0);
        }

        it("SIGINT handler should call closeConnection and process.exit", async () => {
            await testSignalHandler("SIGINT");
        });

         it("SIGTERM handler should call closeConnection and process.exit", async () => {
            await testSignalHandler("SIGTERM");
        });
    });

});
