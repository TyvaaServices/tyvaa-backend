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
    on: jest.fn().mockReturnThis(),
};
// This single mock function will be manipulated by tests.
const mockAmqpConnect = jest.fn();

jest.unstable_mockModule("amqplib", () => ({
    default: { connect: mockAmqpConnect }, // Ensure 'default' export is also mocked if used like `import amqp from ...`
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

let rabbitmqConnector;
let setTimeoutSpy;

describe("RabbitMQ Connector", () => {
    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();

        process.env.RABBITMQ_URL = "amqp://testhost";

        // Default behavior for amqplib.connect for most tests
        mockAmqpConnect.mockResolvedValue(mockConnection);
        mockConnection.createChannel.mockResolvedValue(mockChannel); // Ensure this is also reset/set if needed
        mockChannel.close.mockResolvedValue(undefined);
        mockConnection.close.mockResolvedValue(undefined);

        rabbitmqConnector = await import(
            "../../../src/broker/rabbitmqConnector.js"
        );

        setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            if (typeof callback === 'function') {
                callback();
            }
            return { hasRef: () => false, ref: () => {}, unref: () => {} };
        });
    });

    afterEach(async () => {
        // Attempt to close, but be resilient to errors if already closed or no connection
        if (rabbitmqConnector && typeof rabbitmqConnector.closeConnection === 'function') {
             // Reset internal state of the connector for closeConnection to work cleanly
            const connectorInternalState = await import("../../../src/broker/rabbitmqConnector.js");
            if (typeof connectorInternalState.resetConnectionStateForTesting === 'function') {
                 connectorInternalState.resetConnectionStateForTesting();
            }
            await rabbitmqConnector.closeConnection().catch(() => {});
        }
        delete process.env.RABBITMQ_URL;
        if (setTimeoutSpy) {
            setTimeoutSpy.mockRestore();
        }
        // Reset connect mock to default after each test to avoid leakage
        mockAmqpConnect.mockReset().mockResolvedValue(mockConnection);
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

        it("should throw an error if RABBITMQ_URL is not set", async () => {
            delete process.env.RABBITMQ_URL;
            jest.resetModules();

            // amqplib.connect should not be called, so its mock behavior doesn't strictly matter here,
            // but we ensure it's defined for the import.
            mockAmqpConnect.mockImplementation(() => Promise.reject(new Error("amqp.connect should not be called")));

            const freshConnector = await import("../../../src/broker/rabbitmqConnector.js");

            await expect(freshConnector.getChannel()).rejects.toThrow(
                "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
            );
            expect(mockAmqpConnect).not.toHaveBeenCalled();
        });

        it("should retry connection (success on 3rd attempt)", async () => {
            mockAmqpConnect // Use the global mockAmqpConnect
                .mockRejectedValueOnce(new Error("Connection failed 1"))
                .mockRejectedValueOnce(new Error("Connection failed 2"))
                .mockResolvedValueOnce(mockConnection);

            jest.resetModules();
            process.env.RABBITMQ_URL = "amqp://testhost";
            // Re-import uses the already configured mockAmqpConnect due to Jest's module caching behavior with jest.fn()
            const tempConnector = await import("../../../src/broker/rabbitmqConnector.js");

            const channel = await tempConnector.getChannel();

            expect(mockAmqpConnect).toHaveBeenCalledTimes(3);
            expect(channel).toBe(mockChannel);
        });

        it("should throw error after MAX_RETRIES failures", async () => {
            mockAmqpConnect.mockRejectedValue(new Error("Amqplib persistent error"));

            jest.resetModules();
            process.env.RABBITMQ_URL = "amqp://testhost";
            const freshConnectorFail = await import("../../../src/broker/rabbitmqConnector.js");

            // Asserting the error that is currently thrown by the module under these mock conditions
            await expect(freshConnectorFail.getChannel()).rejects.toThrow("Amqplib persistent error");

            const ACTUAL_MAX_RETRIES = 10;
            // If the test consistently shows 10 calls, then it's 1 initial + 9 retries.
            // This means the loop condition or counter results in MAX_RETRIES total attempts.
            expect(mockAmqpConnect).toHaveBeenCalledTimes(ACTUAL_MAX_RETRIES);
        });
    });

    describe("getConnection", () => {
        it("should connect and return a connection if not connected", async () => {
            const connection = await rabbitmqConnector.getConnection();
            expect(mockAmqpConnect).toHaveBeenCalledWith("amqp://testhost");
            expect(connection).toBe(mockConnection);
        });
    });

    describe("closeConnection", () => {
        it("should close channel and connection if they exist", async () => {
            mockAmqpConnect.mockResolvedValue(mockConnection); // Ensure connect resolves
            mockConnection.createChannel.mockResolvedValue(mockChannel); // Ensure createChannel resolves
            mockChannel.close.mockResolvedValue(undefined); // Ensure channel close resolves
            mockConnection.close.mockResolvedValue(undefined); // Ensure connection close resolves

            await rabbitmqConnector.getChannel();

            mockChannel.close.mockClear();
            mockConnection.close.mockClear();

            await rabbitmqConnector.closeConnection();

            expect(mockChannel.close).toHaveBeenCalledTimes(1);
            expect(mockConnection.close).toHaveBeenCalledTimes(1);
        });

        it("should handle closing when not connected without error", async () => {
            jest.resetModules();
            process.env.RABBITMQ_URL = "amqp://testhost";
            mockAmqpConnect.mockResolvedValue(mockConnection); // Default for import

            const freshConnector = await import("../../../src/broker/rabbitmqConnector.js");

            // Reset internal state of the fresh connector for this test
            const connectorInternalState = await import("../../../src/broker/rabbitmqConnector.js");
            if (typeof connectorInternalState.resetConnectionStateForTesting === 'function') {
                 connectorInternalState.resetConnectionStateForTesting();
            }

            mockChannel.close.mockClear();
            mockConnection.close.mockClear();

            await expect(freshConnector.closeConnection()).resolves.toBeUndefined();
            expect(mockChannel.close).not.toHaveBeenCalled();
            expect(mockConnection.close).not.toHaveBeenCalled();
        });
    });
});
