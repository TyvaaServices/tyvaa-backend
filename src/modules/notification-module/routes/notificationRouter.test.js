import Fastify from "fastify";
import { jest } from '@jest/globals'; // Import jest explicitly
import notificationRouter from "./notificationRouter.js"; // ES6 import
import { RIDER_ACCEPT_RIDE, getNotificationTemplate as actualGetNotificationTemplate } from "../templates.js";

// Mock firebase-admin/app
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{ name: '[DEFAULT]' }]),
  cert: jest.fn(),
}));

// Mock firebase-admin/messaging
const mockActualFcmSend = jest.fn(); // This will be the function we check calls on
jest.mock("firebase-admin/messaging", () => {
  return {
    getMessaging: jest.fn().mockImplementation(() => { // getMessaging is a mock function
      return { // that returns an object
        send: mockActualFcmSend, // which has a send method (our mockActualFcmSend)
        // Mock other methods of the Messaging service if any are used by the code under test.
      };
    }),
    // Mock other exports from 'firebase-admin/messaging' if used.
  };
});

// Mock templates.js
const mockGetNotificationTemplate = jest.fn();
jest.mock("../templates.js", () => ({
    // Retain all actual exports from templates.js
    ...(jest.requireActual("../templates.js")),
    // Override getNotificationTemplate with our mock
    getNotificationTemplate: mockGetNotificationTemplate,
}));


describe("Notification Router", () => {
    let app;

    beforeAll(async () => {
        app = Fastify();
        app.register(notificationRouter);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        // Reset and re-configure mocks for each test
        // Note: mockGetMessaging (the mock fn for getMessaging itself) is not directly cleared here,
        // but its underlying implementation (if it had one) or its return value's methods are.
        // We primarily care about mockActualFcmSend and mockGetNotificationTemplate.
        mockActualFcmSend.mockReset().mockResolvedValue("mocked-fcm-response");
        mockGetNotificationTemplate.mockReset();

        // If you need to check calls to getMessaging itself:
        // const { getMessaging } = require('firebase-admin/messaging');
        // getMessaging.mockClear();


        // Configure getNotificationTemplate for the specific test cases as needed
        mockGetNotificationTemplate.mockImplementation((eventType, data) => {
            if (eventType === "VALID_EVENT") {
                const name = data && data.name ? data.name : "default";
                return { title: `Title for ${name}`, body: `Body for ${name}` };
            } else if (eventType === RIDER_ACCEPT_RIDE) {
                 return { title: "Ride Accepted", body: `${data.riderName} has accepted your ride request.`};
            }
            // Fallback to actual implementation or return null if specific eventType not handled by mock
            // For this test suite, we generally want to control the template output fully.
            return null;
        });
    });

    it("POST /send-notification should send notification with valid eventType and data", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/send-notification",
            payload: {
                token: "test-token",
                eventType: "VALID_EVENT", // Use a generic valid event for this test
                data: { }, // Simplified data
            },
        });
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual({
            status: "Notification sent",
        });
        // You might want to check if getMessaging().send was called with correct params
        // For that, you'd need to import the mock from firebase-admin/messaging
    });

    it("POST /send-notification should correctly use RIDER_ACCEPT_RIDE template", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/send-notification",
            payload: {
                token: "test-token-rider-accept",
                eventType: RIDER_ACCEPT_RIDE,
                data: { riderName: "John Doe" },
            },
        });
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual({
            status: "Notification sent",
        });
         // Potentially check that sendFCM was called with "Ride Accepted" and "John Doe has accepted your ride request."
    });

    it("POST /send-notification should return 400 if token is missing", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/send-notification",
            payload: {
                eventType: "VALID_EVENT",
                data: { name: "Test User" },
            },
        });
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload)).toEqual({
            error: "Missing required fields: token, eventType, data",
        });
    });

    it("POST /send-notification should return 400 if eventType is missing", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/send-notification",
            payload: {
                token: "test-token",
                data: { name: "Test User" },
            },
        });
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload)).toEqual({
            error: "Missing required fields: token, eventType, data",
        });
    });

    it("POST /send-notification should return 400 if data is missing", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/send-notification",
            payload: {
                token: "test-token",
                eventType: "VALID_EVENT",
            },
        });
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload)).toEqual({
            error: "Missing required fields: token, eventType, data",
        });
    });

    it("POST /send-notification should return 400 for an invalid eventType", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/send-notification",
            payload: {
                token: "test-token",
                eventType: "INVALID_EVENT_TYPE",
                data: { name: "Test User" },
            },
        });
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload)).toEqual({
            error: "Invalid eventType or template not found",
        });
    });
});
