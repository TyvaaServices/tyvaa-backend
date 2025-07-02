import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import Fastify from "fastify";




const mockBrokerInstance = {
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue({
        
        catch: jest.fn().mockResolvedValue(undefined), 
    }),
    acknowledge: jest.fn(),
    nack: jest.fn(),
    
};
const mockBrokerManager = {
    getInstance: jest.fn(() => mockBrokerInstance),
    
};
jest.unstable_mockModule("#broker/broker.js", () => ({
    __esModule: true, 
    default: mockBrokerManager,
}));


const mockGetNotificationTemplate = jest.fn();







jest.unstable_mockModule(
    "../../../src/modules/notification-module/templates.js", 
    () => ({
        __esModule: true,
        getNotificationTemplate: mockGetNotificationTemplate,
    })
);


const mockSendFCM = jest.fn();
jest.unstable_mockModule(
    "../../../src/modules/notification-module/routes/notificationRouter.js", 
    () => ({
        __esModule: true,
        sendFCM: mockSendFCM, 
        default: jest.fn(async (fastify, _opts) => {
            
            
            
            
            
        }),
    })
);


const mockFirebaseInitializeApp = jest.fn();
const mockFirebaseCert = jest.fn();
jest.unstable_mockModule("firebase-admin/app", () => ({
    initializeApp: mockFirebaseInitializeApp,
    cert: mockFirebaseCert,
}));



let notificationModuleServer;

describe("Notification Module Server", () => {
    let fastify;

    beforeEach(async () => {
        
        jest.clearAllMocks();

        
        fastify = Fastify();
        
        fastify.log = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };

        
        notificationModuleServer = (
            await import("../../../src/modules/notification-module/server.js")
        ).default;

        
        await fastify.register(notificationModuleServer);
        await fastify.ready(); 
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
            "notification_created", 
            expect.any(Function), 
            { noAck: false } 
        );
    });

    describe("Message Processing via Broker Subscription", () => {
        let subscribeCallback;
        const mockAmqpMessage = {
            properties: { messageId: "amqp-test-id-123" },
        };

        beforeEach(() => {
            
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
            mockSendFCM.mockResolvedValue(undefined); 

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
            }; 

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
            mockGetNotificationTemplate.mockReturnValue(null); 

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
            mockSendFCM.mockRejectedValue(fcmError); 

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
                throw topLevelError; 
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
        jest.resetModules(); 
        mockBrokerInstance.connect.mockRejectedValueOnce(
            new Error("Broker connect failed")
        );

        
        notificationModuleServer = (
            await import("../../../src/modules/notification-module/server.js")
        ).default;
        fastify = Fastify(); 
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
            
        }

        expect(fastify.log.error).toHaveBeenCalledWith(
            "Failed to connect broker for notification module:",
            expect.any(Error)
        );
        
        
    });

    it("should log an error if broker subscription fails", async () => {
        
        jest.resetModules();

        
        const subscribeError = new Error("Subscription failed");
        const failingMockBrokerInstance = {
            ...mockBrokerInstance, 
            connect: jest.fn().mockResolvedValue(undefined), 
            subscribe: jest.fn().mockReturnValue({
                
                catch: jest.fn((errorHandler) => {
                    errorHandler(subscribeError); 
                    return Promise.resolve(); 
                }),
            }),
        };
        const failingMockBrokerManager = {
            getInstance: jest.fn(() => failingMockBrokerInstance),
        };

        jest.unstable_mockModule("#broker/broker.js", () => ({
            __esModule: true,
            default: failingMockBrokerManager,
        }));

        
        jest.unstable_mockModule(
            "../../../src/modules/notification-module/templates.js",
            () => ({
                __esModule: true,
                getNotificationTemplate: mockGetNotificationTemplate,
            })
        );
        jest.unstable_mockModule(
            "../../../src/modules/notification-module/routes/notificationRouter.js",
            () => ({
                __esModule: true,
                sendFCM: mockSendFCM,
                default: jest.fn(),
            })
        );
        jest.unstable_mockModule("firebase-admin/app", () => ({
            initializeApp: mockFirebaseInitializeApp,
            cert: mockFirebaseCert,
        }));

        
        const freshNotificationModuleServer = (
            await import("../../../src/modules/notification-module/server.js")
        ).default;

        const newFastify = Fastify();
        newFastify.log = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };

        await newFastify.register(freshNotificationModuleServer);
        try {
            await newFastify.ready();
        } catch (e) {
            
        }

        expect(newFastify.log.error).toHaveBeenCalledWith(
            "Failed to subscribe to notification_created queue:",
            subscribeError
        );
        await newFastify.close();
    });
});
