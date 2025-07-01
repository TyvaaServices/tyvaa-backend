import dotenv from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import router from "./routes/notificationRouter.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import brokerManager from "#broker/broker.js";

dotenv.config();

const broker = brokerManager.getInstance();

/**
 * @async
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance.
 * @param {object} _opts - Plugin options (not used).
 * @description Initializes Firebase Admin SDK, registers notification routes,
 * connects to the message broker, and subscribes to the 'notification_created' queue
 * to process and send notifications.
 */
export default async function notificationModule(fastify, _opts) {
    const base64Key = process.env.FIREBASE_KEY_BASE64;
    if (!base64Key) {
        fastify.log.error(
            "FIREBASE_KEY_BASE64 environment variable is not set. Skipping Firebase initialization."
        );
    } else {
        const jsonString = Buffer.from(base64Key, "base64").toString("utf-8");
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const keyPath = path.join(__dirname, "temp_service_account.json");
        if (!fs.existsSync(keyPath)) {
            fs.writeFileSync(keyPath, jsonString);
        }
        initializeApp({
            credential: cert(keyPath),
        });
    }
    fastify.register(router, { prefix: "/api/v1" });

    console.log("Notification subscriber starting...");

    // Connect the broker
    try {
        await broker.connect();
        fastify.log.info(
            "Broker connected successfully for notification module."
        );
    } catch (error) {
        fastify.log.error(
            "Failed to connect broker for notification module:",
            error
        );
        // Depending on recovery strategy, might want to throw or exit
        // For now, it will prevent subscriptions if connection fails
    }

    // Subscribe to the notification_created queue.
    // The callback receives the parsed message content (payload) and the original AMQP message (originalMessage).
    broker
        .subscribe(
            "notification_created", // queueName
            async (payload, originalMessage) => {
                // callback
                try {
                    fastify.log.info(
                        `[Notification Subscriber] Received message from notification_created queue. Message ID: ${originalMessage.properties.messageId}`,
                        { payload }
                    );

                    const { token, eventType, data } = payload;

                    if (!token || !eventType || !data) {
                        fastify.log.error(
                            "Missing required fields in broker message: token, eventType, or data.",
                            { payload }
                        );
                        // Do not requeue messages with malformed/missing critical data.
                        broker.nack(originalMessage, false, false);
                        fastify.log.warn(
                            `Nacked message due to missing fields. Message ID: ${originalMessage.properties.messageId}`
                        );
                        return;
                    }

                    const { getNotificationTemplate } = await import(
                        "./templates.js"
                    );
                    const language = data.language === "fr" ? "fr" : "en"; // Default to 'en'
                    const template = getNotificationTemplate(
                        eventType,
                        data,
                        language
                    );

                    if (!template) {
                        fastify.log.error(
                            `Invalid eventType or template not found for event: ${eventType}.`,
                            { payload }
                        );
                        // Do not requeue if template is not found for this event type.
                        broker.nack(originalMessage, false, false);
                        fastify.log.warn(
                            `Nacked message due to invalid eventType/template. Message ID: ${originalMessage.properties.messageId}`
                        );
                        return;
                    }

                    const { sendFCM } = await import(
                        "./routes/notificationRouter.js"
                    );
                    try {
                        fastify.log.info(
                            `[Notification Subscriber] Attempting to send FCM notification for event ${eventType} to token ${token}. Message ID: ${originalMessage.properties.messageId}`
                        );
                        await sendFCM(
                            token,
                            template.title,
                            template.body,
                            data
                        );
                        fastify.log.info(
                            `FCM Notification sent successfully for event ${eventType} to token ${token}. Message ID: ${originalMessage.properties.messageId}`
                        );
                        broker.acknowledge(originalMessage); // Acknowledge successful processing
                        fastify.log.info(
                            `Acknowledged message. Message ID: ${originalMessage.properties.messageId}`
                        );
                    } catch (fcmError) {
                        fastify.log.error(
                            `Error sending FCM notification for event ${eventType}. Message ID: ${originalMessage.properties.messageId}`,
                            { error: fcmError, payload }
                        );
                        // Decide on requeue strategy for FCM errors.
                        // For example, requeue for transient errors, don't for permanent ones (e.g., invalid token).
                        // For simplicity here, let's not requeue on FCM error to avoid potential loops with bad tokens.
                        // A more robust solution might inspect fcmError.
                        broker.nack(originalMessage, false, false);
                        fastify.log.warn(
                            `Nacked message due to FCM send error. Message ID: ${originalMessage.properties.messageId}`
                        );
                    }
                } catch (topLevelError) {
                    fastify.log.error(
                        `[Notification Subscriber] Unexpected top-level error processing message. Message ID: ${originalMessage?.properties?.messageId}`,
                        { error: topLevelError, payload }
                    );
                    // Don't requeue for unexpected errors to prevent processing loops.
                    // Ensure message is nacked if originalMessage is available.
                    if (originalMessage) {
                        broker.nack(originalMessage, false, false);
                        fastify.log.warn(
                            `Nacked message due to unexpected top-level error. Message ID: ${originalMessage.properties.messageId}`
                        );
                    }
                }
            },
            { noAck: false } // options for consume: ensure we handle acknowledgements explicitly
        )
        .catch((error) => {
            fastify.log.error(
                "Failed to subscribe to notification_created queue:",
                error
            );
            // Handle subscription failure (e.g., retry, log critical error)
        });
}
