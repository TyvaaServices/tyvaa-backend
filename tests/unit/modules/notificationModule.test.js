import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import Fastify from "fastify";

// --- Mocks ---

// Mock #broker/broker.js
const mockBrokerInstance = {
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    acknowledge: jest.fn(),
    nack: jest.fn(),
    // Add any other methods called by the notification module if necessary
};
const mockBrokerManager = {
    getInstance: jest.fn(() => mockBrokerInstance),
    // BrokerClass: jest.fn() // If BrokerClass is ever used directly
};
jest.unstable_mockModule("#broker/broker.js", () => ({
    __esModule: true, // if it's an ES module
    default: mockBrokerManager,
}));

// Mock templates.js
const mockGetNotificationTemplate = jest.fn();
jest.unstable_mockModule(
    "../../src/modules/notification-module/templates.js",
    () => ({
        __esModule: true,
        getNotificationTemplate: mockGetNotificationTemplate,
    })
);

// Mock notificationRouter.js (specifically for sendFCM, assuming it's an export)
const mockSendFCM = jest.fn();
jest.unstable_mockModule(
    "../../src/modules/notification-module/routes/notificationRouter.js",
    () => ({
        __esModule: true,
        sendFCM: mockSendFCM,
        // If notificationRouter is a fastify plugin itself and sendFCM is a method on it,
        // the mocking strategy might need to be different, e.g. mocking the plugin registration.
        // For now, assuming sendFCM is an exported function.
    })
);

// Mock firebase-admin (if its direct init in notification module causes issues in test)
const mockFirebaseInitializeApp = jest.fn();
const mockFirebaseCert = jest.fn();
jest.unstable_mockModule("firebase-admin/app", () => ({
    initializeApp: mockFirebaseInitializeApp,
    cert: mockFirebaseCert,
}));

// --- Test Subject ---
// Dynamically import the notification module after all mocks are set up
let notificationModuleServer;

describe("Notification Module Server", () => {
    let fastify;

    beforeEach(async () => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Set up a new Fastify instance for each test
        fastify = Fastify();
        // Mock Fastify's logger to prevent console output during tests and allow assertions
        fastify.log = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };

        // Dynamically import the module to be tested
        notificationModuleServer = (
            await import("../../../src/modules/notification-module/server.js")
        ).default;

        // Register the module with the Fastify instance
        await fastify.register(notificationModuleServer);
        await fastify.ready(); // Ensures plugins are loaded
    });

    afterEach(async () => {
        if (fastify) {
            await fastify.close();
        }
    });

    it('should attempt to connect to the broker and subscribe to "notification_created" on startup', () => {
        expect(mockBrokerManager.getInstance).toHaveBeenCalled();
        expect(mockBrokerInstance.connect).toHaveBeenCalled();
        expect(mockBrokerInstance.subscribe).toHaveBeenCalledWith(
            "notification_created", // queueName
            expect.any(Function), // the callback
            { noAck: false } // options for consume
        );
    });

    describe("Message Processing via Broker Subscription", () => {
        let subscribeCallback;
        const mockAmqpMessage = {
            properties: { messageId: "amqp-test-id-123" },
        };

        beforeEach(() => {
            // Capture the subscribe callback
            if (mockBrokerInstance.subscribe.mock.calls.length > 0) {
                subscribeCallback =
                    mockBrokerInstance.subscribe.mock.calls[0][1];
            } else {
                throw new Error(
                    "Broker subscribe was not called, cannot capture callback."
                );
            }
        });

        it("should process a valid message, send FCM, and acknowledge", async () => {
            const messagePayload = {
                token: "valid-token",
                eventType: "USER_WELCOME",
                data: { name: "Test User", language: "en" },
            };
            mockGetNotificationTemplate.mockReturnValue({
                title: "Welcome!",
                body: "Hello Test User",
            });
            mockSendFCM.mockResolvedValue(undefined); // Simulate successful FCM send

            await subscribeCallback(messagePayload, mockAmqpMessage);

            expect(mockGetNotificationTemplate).toHaveBeenCalledWith(
                "USER_WELCOME",
                messagePayload.data,
                "en"
            );
            expect(mockSendFCM).toHaveBeenCalledWith(
                "valid-token",
                "Welcome!",
                "Hello Test User",
                messagePayload.data
            );
            expect(mockBrokerInstance.acknowledge).toHaveBeenCalledWith(
                mockAmqpMessage
            );
            expect(mockBrokerInstance.nack).not.toHaveBeenCalled();
        });

        it("should nack if required fields (token) are missing from payload", async () => {
            const messagePayload = {
                eventType: "USER_WELCOME",
                data: { name: "Test User" },
            }; // Missing token

            await subscribeCallback(messagePayload, mockAmqpMessage);

            expect(mockGetNotificationTemplate).not.toHaveBeenCalled();
            expect(mockSendFCM).not.toHaveBeenCalled();
            expect(mockBrokerInstance.nack).toHaveBeenCalledWith(
                mockAmqpMessage,
                false,
                false
            );
            expect(mockBrokerInstance.acknowledge).not.toHaveBeenCalled();
            expect(fastify.log.error).toHaveBeenCalledWith(
                "Missing required fields in broker message: token, eventType, or data.",
                { payload: messagePayload }
            );
        });

        it("should nack if template is not found for eventType", async () => {
            const messagePayload = {
                token: "valid-token",
                eventType: "UNKNOWN_EVENT",
                data: { language: "en" },
            };
            mockGetNotificationTemplate.mockReturnValue(null); // Simulate template not found

            await subscribeCallback(messagePayload, mockAmqpMessage);

            expect(mockGetNotificationTemplate).toHaveBeenCalledWith(
                "UNKNOWN_EVENT",
                messagePayload.data,
                "en"
            );
            expect(mockSendFCM).not.toHaveBeenCalled();
            expect(mockBrokerInstance.nack).toHaveBeenCalledWith(
                mockAmqpMessage,
                false,
                false
            );
            expect(mockBrokerInstance.acknowledge).not.toHaveBeenCalled();
            expect(fastify.log.error).toHaveBeenCalledWith(
                `Invalid eventType or template not found for event: UNKNOWN_EVENT.`,
                { payload: messagePayload }
            );
        });

        it("should nack if sendFCM throws an error", async () => {
            const messagePayload = {
                token: "valid-token",
                eventType: "USER_WELCOME",
                data: { name: "Test User", language: "en" },
            };
            mockGetNotificationTemplate.mockReturnValue({
                title: "Welcome!",
                body: "Hello Test User",
            });
            const fcmError = new Error("FCM Failed");
            mockSendFCM.mockRejectedValue(fcmError); // Simulate FCM send failure

            await subscribeCallback(messagePayload, mockAmqpMessage);

            expect(mockSendFCM).toHaveBeenCalled();
            expect(mockBrokerInstance.nack).toHaveBeenCalledWith(
                mockAmqpMessage,
                false,
                false
            );
            expect(mockBrokerInstance.acknowledge).not.toHaveBeenCalled();
            expect(fastify.log.error).toHaveBeenCalledWith(
                `Error sending FCM notification for event USER_WELCOME. Message ID: ${mockAmqpMessage.properties.messageId}`,
                { error: fcmError, payload: messagePayload }
            );
        });

        it("should nack on top-level error within callback", async () => {
            const messagePayload = {
                token: "valid-token",
                eventType: "USER_WELCOME",
                data: { language: "en" },
            };
            const topLevelError = new Error("Something unexpected happened");
            mockGetNotificationTemplate.mockImplementation(() => {
                throw topLevelError; // Simulate error during template generation
            });

            await subscribeCallback(messagePayload, mockAmqpMessage);

            expect(mockSendFCM).not.toHaveBeenCalled();
            expect(mockBrokerInstance.nack).toHaveBeenCalledWith(
                mockAmqpMessage,
                false,
                false
            );
            expect(mockBrokerInstance.acknowledge).not.toHaveBeenCalled();
            expect(fastify.log.error).toHaveBeenCalledWith(
                `[Notification Subscriber] Unexpected top-level error processing message. Message ID: ${mockAmqpMessage.properties.messageId}`,
                expect.objectContaining({ error: topLevelError })
            );
        });
    });

    it("should log an error if broker connection fails", async () => {
        jest.resetModules(); // Reset modules to re-evaluate imports with new mock behavior
        mockBrokerInstance.connect.mockRejectedValueOnce(
            new Error("Broker connect failed")
        );

        // Re-import and re-register with the failing mock
        notificationModuleServer = (
            await import("../../../src/modules/notification-module/server.js")
        ).default;
        fastify = Fastify(); // New instance
        fastify.log = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };
        await fastify.register(notificationModuleServer);
        try {
            await fastify.ready();
        } catch (e) {
            // Expected if broker connection failure is critical, or handle gracefully
        }

        expect(fastify.log.error).toHaveBeenCalledWith(
            "Failed to connect broker for notification module:",
            expect.any(Error)
        );
        // Depending on implementation, subscribe might not be called if connect fails
        // expect(mockBrokerInstance.subscribe).not.toHaveBeenCalled();
    });

    it("should log an error if broker subscription fails", async () => {
        mockBrokerInstance.subscribe.mockRejectedValueOnce(
            new Error("Subscription failed")
        );

        // For this test, we assume connect succeeds.
        // We need to re-register or re-initialize the module in a state where connect has "succeeded"
        // but subscribe will fail. This might require another jest.resetModules() and careful setup.

        // Simpler: directly call the plugin function after it's been imported once.
        // The initial beforeEach already registers it. We just need to ensure `subscribe` is called.
        // The `await fastify.ready()` in beforeEach should have triggered the subscribe.
        // So, if subscribe was set to reject, this test would pass if the error is logged.

        // This relies on the subscribe call during fastify.ready() in beforeEach.
        // If the error is thrown and not caught by the plugin, fastify.ready() would throw.
        // The current notification module catches this and logs.
        expect(fastify.log.error).toHaveBeenCalledWith(
            "Failed to subscribe to notification_created queue:",
            expect.any(Error)
        );
    });
});
