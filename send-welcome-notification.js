#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();
import broker from "./src/broker/broker.js";
import createLogger from "./src/utils/logger.js";

console.log(
    "[ENV] UPSTASH_REDIS_REST_URL:",
    process.env.UPSTASH_REDIS_REST_URL
);
console.log(
    "[ENV] UPSTASH_REDIS_REST_TOKEN:",
    process.env.UPSTASH_REDIS_REST_TOKEN
);

const logger = createLogger("welcome-notification-sender");

// FCM Token provided by user
const FCM_TOKEN =
    "c6pC4TWQQLa_s-kdBIEAlu:APA91bFp8VZnXOwBh2LOGmFT8cHzjI_MNgDG7e6Gzym0pPI8znJ4SWxg01FhU8aH3wKTEM7zYJoGsVKtSNkJLNJIJZHyTI6Hak8VXtYAhgoMAAYltORS05c";

/**
 * Publishes a welcome notification event to the broker
 */
async function sendWelcomeNotification() {
    try {
        logger.info("Starting welcome notification process...");

        // Message payload that matches the notification module's expected format
        const notificationMessage = {
            token: FCM_TOKEN,
            eventType: "WELCOME_MESSAGE", // This event type exists in templates.js
            data: {
                userName: "John Doe", // This will be substituted in the template
                language: "en", // or "fr" for French
                // Add any additional data needed
            },
            messageId: `welcome-${Date.now()}`, // Unique message ID for acknowledgment
        };

        // Publish the message to the notification_created queue
        const messageId = await broker.publish(
            "notification_created",
            notificationMessage
        );

        logger.info(
            `Welcome notification published successfully with messageId: ${messageId}`
        );
        logger.info(`Notification will be sent to FCM token: ${FCM_TOKEN}`);

        // Wait a bit to allow processing
        setTimeout(() => {
            logger.info("Welcome notification process completed");
            process.exit(0);
        }, 2000);
    } catch (error) {
        console.error("Error sending welcome notification:", error);
        process.exit(1);
    }
}

/**
 * Alternative function using different event types that might already exist in your templates
 */
async function sendAlternativeWelcomeNotification() {
    try {
        logger.info("Starting alternative welcome notification...");

        // Try with a user registration event type (this might already exist in your templates)
        const notificationMessage = {
            token: FCM_TOKEN,
            eventType: "USER_REGISTERED", // This might already exist in your notification templates
            data: {
                userName: "New User",
                fullName: "John Doe",
                language: "en",
                registrationDate: new Date().toISOString(),
            },
            messageId: `user-registered-${Date.now()}`,
        };

        const messageId = broker.publish(
            "notification_created",
            notificationMessage
        );

        logger.info(
            `Alternative welcome notification published with messageId: ${messageId}`
        );

        setTimeout(() => {
            process.exit(0);
        }, 2000);
    } catch (error) {
        logger.error("Error sending alternative welcome notification:", error);
        process.exit(1);
    }
}

/**
 * Test function to send a ride-related notification (likely to have existing templates)
 */
async function sendRideNotification() {
    try {
        logger.info("Starting ride notification test...");

        const notificationMessage = {
            token: FCM_TOKEN,
            eventType: "RIDER_ACCEPT_RIDE", // This matches the example in your notificationRouter.js
            data: {
                riderName: "John Doe",
                rideDetails: "Test ride from Downtown to Airport",
                language: "en",
                pickupLocation: "Downtown",
                destination: "Airport",
            },
            messageId: `ride-accept-${Date.now()}`,
        };

        const messageId = broker.publish(
            "notification_created",
            notificationMessage
        );

        logger.info(`Ride notification published with messageId: ${messageId}`);

        setTimeout(() => {
            process.exit(0);
        }, 2000);
    } catch (error) {
        logger.error("Error sending ride notification:", error);
        process.exit(1);
    }
}

// Command line argument handling
const args = process.argv.slice(2);
const notificationType = args[0] || "welcome";

switch (notificationType) {
    case "welcome":
        sendWelcomeNotification();
        break;
    case "alternative":
        sendAlternativeWelcomeNotification();
        break;
    case "ride":
        sendRideNotification();
        break;
    default:
        console.log(
            "Usage: node send-welcome-notification.js [welcome|alternative|ride]"
        );
        console.log(
            "  welcome    - Send a welcome notification (requires WELCOME template)"
        );
        console.log("  alternative - Send using USER_REGISTERED event type");
        console.log("  ride       - Send a test ride notification");
        process.exit(1);
}
