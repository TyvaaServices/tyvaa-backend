#!/usr/bin/env node

import brokerModule from "./src/broker/broker.js";
import createLogger from "./src/utils/logger.js";

const logger = createLogger("welcome-notification-sender");

// FCM Token provided by user
const FCM_TOKEN =
    "c6pC4TWQQLa_s-kdBIEAlu:APA91bFp8VZnXOwBh2LOGmFT8cHzjI_MNgDG7e6Gzym0pPI8znJ4SWxg01FhU8aH3wKTEM7zYJoGsVKtSNkJLNJIJZHyTI6Hak8VXtYAhgoMAAYltORS05c";

/**
 * Sends a welcome notification using the existing WELCOME_MESSAGE template
 */
async function sendWelcomeNotification() {
    let broker;
    try {
        logger.info("Sending welcome notification...");

        // Get broker instance and connect
        broker = brokerModule.getInstance();
        await broker.connect();
        logger.info("Broker connected successfully");

        const notificationMessage = {
            token: FCM_TOKEN,
            eventType: "WELCOME_MESSAGE",
            data: {
                userName: "Houleymato Diallo",
                language: "fr", // Change to "fr" for French
            },
            messageId: `welcome-${Date.now()}`,
        };

        await broker.sendToQueue("notification_created", notificationMessage);

        logger.info(`Welcome notification published successfully`);
        logger.info(`FCM Token: ${FCM_TOKEN}`);

        // Wait for processing
        setTimeout(async () => {
            logger.info("Notification sent successfully!");
            if (broker) {
                await broker.destroy();
            }
            process.exit(0);
        }, 3000);
    } catch (error) {
        logger.error("Error sending welcome notification:", error);
        if (broker) {
            try {
                await broker.destroy();
            } catch (closeError) {
                console.error("Error closing broker:", closeError);
            }
        }
        process.exit(1);
    }
}

/**
 * Sends a French welcome notification
 */
async function sendFrenchWelcomeNotification() {
    let broker;
    try {
        logger.info("Sending French welcome notification...");

        // Get broker instance and connect
        broker = brokerModule.getInstance();
        await broker.connect();
        logger.info("Broker connected successfully");

        const notificationMessage = {
            token: FCM_TOKEN,
            eventType: "WELCOME_MESSAGE",
            data: {
                userName: "Jean Dupont",
                language: "fr",
            },
            messageId: `welcome-fr-${Date.now()}`,
        };

        await broker.sendToQueue("notification_created", notificationMessage);

        logger.info(`French welcome notification published successfully`);

        setTimeout(async () => {
            logger.info("Notification française envoyée avec succès!");
            if (broker) {
                await broker.destroy();
            }
            process.exit(0);
        }, 3000);
    } catch (error) {
        logger.error("Error sending French welcome notification:", error);
        if (broker) {
            try {
                await broker.destroy();
            } catch (closeError) {
                console.error("Error closing broker:", closeError);
            }
        }
        process.exit(1);
    }
}

// Check command line arguments
const language = process.argv[2] || "en";

if (language === "fr") {
    sendFrenchWelcomeNotification();
} else {
    sendWelcomeNotification();
}
