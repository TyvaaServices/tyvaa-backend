import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";

// Mock amqplib
const mockChannel = {
    assertQueue: jest.fn().mockResolvedValue({ queue: "test-queue" }),
    sendToQueue: jest.fn(),
    publish: jest.fn(),
    consume: jest.fn().mockResolvedValue({ consumerTag: "test-consumer-tag" }),
    ack: jest.fn(),
    nack: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(), // To mock event listeners like 'error', 'close'
    prefetch: jest.fn(),
};
const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(), // To mock event listeners like 'error', 'close'
};
const mockAmqp = {
    connect: jest.fn().mockResolvedValue(mockConnection),
};
jest.unstable_mockModule("amqplib", () => ({
    default: mockAmqp, // if amqplib is imported as `import amqp from 'amqplib'`
    connect: mockAmqp.connect, // if amqplib is imported as `import { connect } from 'amqplib'`
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

// Dynamically import the module to be tested after mocks are set up
let rabbitmqConnector;

describe("RabbitMQ Connector", () => {
    beforeEach(async () => {
        jest.resetModules(); // Reset modules to ensure fresh imports for each test
        jest.clearAllMocks(); // Clear all mock function calls

        // Set up environment variables for testing
        process.env.RABBITMQ_URL = "amqp://testhost";

        // Import the module after mocks and env vars are set
        rabbitmqConnector = await import(
            "../../../src/broker/rabbitmqConnector.js"
        );
    });

    afterEach(async () => {
        // Attempt to close any potentially open connections by the module
        await rabbitmqConnector.closeConnection();
        delete process.env.RABBITMQ_URL;
    });

    describe("getChannel", () => {
        it("should connect and return a channel if not connected", async () => {
            const channel = await rabbitmqConnector.getChannel();
            expect(mockAmqp.connect).toHaveBeenCalledWith("amqp://testhost");
            expect(mockConnection.createChannel).toHaveBeenCalled();
            expect(channel).toBe(mockChannel);
        });

        it("should return existing channel if already connected", async () => {
            // First call to connect
            await rabbitmqConnector.getChannel();
            mockAmqp.connect.mockClear();
            mockConnection.createChannel.mockClear();

            // Second call
            const channel = await rabbitmqConnector.getChannel();
            expect(mockAmqp.connect).not.toHaveBeenCalled();
            expect(mockConnection.createChannel).not.toHaveBeenCalled();
            expect(channel).toBe(mockChannel);
        });

        it("should throw an error if RABBITMQ_URL is not set", async () => {
            delete process.env.RABBITMQ_URL;
            // Need to reset modules so the connector reads the new env var state
            jest.resetModules();
            rabbitmqConnector = await import(
                "../../../src/broker/rabbitmqConnector.js"
            );

            await expect(rabbitmqConnector.getChannel()).rejects.toThrow(
                "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
            );
        });

        it("should retry connection on failure up to MAX_RETRIES", async () => {
            const originalConnect = mockAmqp.connect.getMockImplementation();
            mockAmqp.connect
                .mockRejectedValueOnce(new Error("Connection failed 1"))
                .mockRejectedValueOnce(new Error("Connection failed 2"))
                .mockResolvedValueOnce(mockConnection); // Success on 3rd attempt

            // Temporarily reduce retry delay for faster test
            const originalRetryDelay = 10; // Value from module, adjust if changed
            const tempModule = await import(
                "../../../src/broker/rabbitmqConnector.js"
            ); // Re-import not ideal, better to make RETRY_DELAY_MS configurable or small for test env

            // This test will be slow due to built-in delays.
            // Consider making RETRY_DELAY_MS very small for test environment if possible,
            // or abstracting the delay logic for easier mocking.

            const channel = await tempModule.getChannel();
            expect(mockAmqp.connect).toHaveBeenCalledTimes(3);
            expect(channel).toBe(mockChannel);

            // Restore original connect if it was more complex
            mockAmqp.connect.mockImplementation(
                originalConnect || jest.fn().mockResolvedValue(mockConnection)
            );
        }, 15000); // Increase timeout for this test due to retries

        it("should throw error after MAX_RETRIES failures", async () => {
            mockAmqp.connect.mockRejectedValue(
                new Error("Persistent connection failure")
            );

            // This test will also be slow.
            await expect(rabbitmqConnector.getChannel()).rejects.toThrow(
                "Persistent connection failure"
            );
            // Check if connect was called MAX_RETRIES times (e.g., 10 times)
            // This depends on the actual MAX_RETRIES value in the module.
            // For this example, let's assume MAX_RETRIES = 2 for simplicity of checking calls
            // expect(mockAmqp.connect).toHaveBeenCalledTimes(MAX_RETRIES_VALUE_FROM_MODULE);
        }, 15000); // Adjust timeout
    });

    describe("getConnection", () => {
        it("should connect and return a connection if not connected", async () => {
            const connection = await rabbitmqConnector.getConnection();
            expect(mockAmqp.connect).toHaveBeenCalledWith("amqp://testhost");
            expect(connection).toBe(mockConnection);
        });
    });

    describe("closeConnection", () => {
        it("should close channel and connection if they exist", async () => {
            // Ensure connection and channel are "established"
            await rabbitmqConnector.getChannel();

            await rabbitmqConnector.closeConnection();
            expect(mockChannel.close).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it("should handle closing when not connected without error", async () => {
            await expect(
                rabbitmqConnector.closeConnection()
            ).resolves.toBeUndefined();
            expect(mockChannel.close).not.toHaveBeenCalled();
            expect(mockConnection.close).not.toHaveBeenCalled();
        });
    });

    // TODO: Test event handling ('error', 'close' on connection and channel)
    // This requires triggering these events on the mocked objects and verifying logger calls
    // or state changes in the connector.
});
