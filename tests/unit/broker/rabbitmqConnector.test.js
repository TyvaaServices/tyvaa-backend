import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";

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
    on: jest.fn().mockReturnThis(),
    connection: {},
};
const mockAmqpConnect = jest.fn();

jest.unstable_mockModule("amqplib", () => ({
    default: { connect: mockAmqpConnect },
    connect: mockAmqpConnect,
}));

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

async function importConnector() {
    const connectorModule = await import(
        "../../../src/broker/rabbitmqConnector.js"
    );
    return connectorModule;
}

describe("RabbitMQ Connector", () => {
    beforeEach(async () => {
        jest.resetModules();jest.clearAllMocks();

        process.env.RABBITMQ_URL = "amqp://testhost";

        mockAmqpConnect.mockResolvedValue(mockConnection);
        mockConnection.createChannel.mockResolvedValue(mockChannel);
        mockConnection.on.mockReturnThis();
        mockChannel.on.mockReturnThis();
        mockChannel.close.mockResolvedValue(undefined);
        mockConnection.close.mockResolvedValue(undefined);
mockProcessOn = jest.spyOn(process, "on");
        mockProcessExit = jest
            .spyOn(process, "exit")
            .mockImplementation((code) => undefined);
            rabbitmqConnector = await import(
            "../../../src/broker/rabbitmqConnector.js"
        );

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
       if (
            rabbitmqConnector &&
            typeof rabbitmqConnector.closeConnection === "function"
        ) {
            await rabbitmqConnector.closeConnection().catch(() => {});
        }

        delete process.env.RABBITMQ_URL;
        if (setTimeoutSpy) setTimeoutSpy.mockRestore();
        mockAmqpConnect.mockReset();
    });

    describe("Configuration and URL Handling", () => {
        it("getChannel should throw if RABBITMQ_URL is not set", async () => {
            delete process.env.RABBITMQ_URL;
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

            const channel = await rabbitmqConnector.getChannel();

            expect(mockAmqpConnect).toHaveBeenCalledTimes(3);
            expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
            expect(channel).toBe(mockChannel);
        });

        it("should throw error after MAX_RETRIES (10) failures", async () => {
            mockAmqpConnect.mockRejectedValue(
                new Error("Persistent connection error")
            );

            await expect(rabbitmqConnector.getChannel()).rejects.toThrow(
                "Persistent connection error"
            );
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
            await rabbitmqConnector.getChannel();
        });

        it("should log error and nullify connection/channel on connection 'error' event", async () => {
            const err = new Error("Connection test error");
            if (connectionErrorHandler) connectionErrorHandler(err);
            expect(mockLogger.error).toHaveBeenCalledWith(
                "RabbitMQ connection error:",
                err
            );

            mockAmqpConnect.mockClear();
            mockAmqpConnect.mockResolvedValue(mockConnection);await rabbitmqConnector.getChannel();
            expect(mockAmqpConnect).toHaveBeenCalledTimes(1);
        });

        it("should log warning and nullify connection/channel on connection 'close' event", async () => {
            if (connectionCloseHandler) connectionCloseHandler();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "RabbitMQ connection closed."
            );
            mockAmqpConnect.mockClear();
            mockAmqpConnect.mockResolvedValue(mockConnection);
            await rabbitmqConnector.getChannel();
            expect(mockAmqpConnect).toHaveBeenCalledTimes(1);
        });

        it("should log error and nullify channel on channel 'error' event", async () => {
            const err = new Error("Channel test error");
            if (channelErrorHandler) channelErrorHandler(err);
            expect(mockLogger.error).toHaveBeenCalledWith(
                "RabbitMQ channel error:",
                err
            );

            mockConnection.createChannel.mockClear();mockConnection.createChannel.mockResolvedValue(mockChannel);await rabbitmqConnector.getChannel();
            expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
        });

        it("should log warning and nullify channel on channel 'close' event", async () => {
            if (channelCloseHandler) channelCloseHandler();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "RabbitMQ channel closed."
            );
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
            expect(mockLogger.info).toHaveBeenCalledWith(
                "RabbitMQ channel closed."
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                "RabbitMQ connection closed."
            );
        });

        it("should handle closing when not connected without error", async () => {
            await expect(
                rabbitmqConnector.closeConnection()
            ).resolves.toBeUndefined();
            expect(mockChannel.close).not.toHaveBeenCalled();
            expect(mockConnection.close).not.toHaveBeenCalled();
        });

        it("should log error if channel.close() fails", async () => {
            await rabbitmqConnector.getChannel();
            const closeError = new Error("Channel close failed");
            mockChannel.close.mockRejectedValueOnce(closeError);

            await rabbitmqConnector.closeConnection();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Error closing RabbitMQ channel:",
                closeError
            );
            expect(mockConnection.close).toHaveBeenCalledTimes(1);
        });

        it("should log error if connection.close() fails", async () => {
            await rabbitmqConnector.getChannel();
            const closeError = new Error("Connection close failed");
            mockConnection.close.mockRejectedValueOnce(closeError);

            await rabbitmqConnector.closeConnection();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Error closing RabbitMQ connection:",
                closeError
            );
            expect(mockChannel.close).toHaveBeenCalledTimes(1);
        });
    });

    describe("isConnecting flag / Concurrent connections", () => {
        it("should wait for existing connection attempt if isConnecting is true", async () => {
            let firstCallResolve;
            mockAmqpConnect.mockImplementationOnce(() => {
                return new Promise((resolve) => {
                    firstCallResolve = () => resolve(mockConnection);
                });
            });

            const firstPromise = rabbitmqConnector.getChannel();const secondPromise = rabbitmqConnector.getChannel();expect(mockLogger.info).toHaveBeenCalledWith(
                "Connection attempt already in progress, awaiting existing attempt."
            );

            if (firstCallResolve) firstCallResolve();const [channel1, channel2] = await Promise.all([
                firstPromise,
                secondPromise,
            ]);

            expect(mockAmqpConnect).toHaveBeenCalledTimes(1);
            expect(channel1).toBe(mockChannel);
            expect(channel2).toBe(mockChannel);
        });

        it("should reject waiting connections if the primary connection attempt fails after retries", async () => {
            mockAmqpConnect.mockRejectedValue(
                new Error("Persistent connection failure")
            );

            const firstPromise = rabbitmqConnector.getChannel().catch((e) => e); 
            const secondPromise = rabbitmqConnector
                .getChannel()
                .catch((e) => e);

            const [result1, result2] = await Promise.all([
                firstPromise,
                secondPromise,
            ]);

            expect(result1).toBeInstanceOf(Error);
            expect(result1.message).toBe("Persistent connection failure");

            expect(result2).toBeInstanceOf(Error);
            expect(result2.message).toBe(
                "Connection attempt finished but failed."
            ); expect(mockAmqpConnect).toHaveBeenCalledTimes(10);
            expect(mockLogger.info).toHaveBeenCalledWith(
                "Connection attempt already in progress, awaiting existing attempt."
            );
        });
    });

    describe("Signal Handlers", () => {
        it("should register SIGINT and SIGTERM handlers upon module load", () => {
            expect(mockProcessOn).toHaveBeenCalledWith(
                "SIGINT",
                expect.any(Function)
            );
            expect(mockProcessOn).toHaveBeenCalledWith(
                "SIGTERM",
                expect.any(Function)
            );
        });

        async function testSignalHandler(signalName) {
            const call = mockProcessOn.mock.calls.find(
                (c) => c[0] === signalName
            );
            expect(call).toBeDefined();
            const handler = call[1];

            mockAmqpConnect.mockResolvedValue(mockConnection);
            mockConnection.createChannel.mockResolvedValue(mockChannel);
            await rabbitmqConnector.getChannel();

            mockConnection.close.mockClear();
            mockChannel.close.mockClear();
            mockProcessExit.mockClear();
            mockLogger.info.mockClear();

            await handler();

            expect(mockLogger.info).toHaveBeenCalledWith(
                `${signalName} received, closing RabbitMQ connection...`
            );
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
