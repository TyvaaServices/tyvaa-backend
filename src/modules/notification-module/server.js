import dotenv from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import router from "./routes/notificationRouter.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import broker from "#broker/broker.js";

dotenv.config();

export default async function (fastify, _opts) {
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
    broker.subscribe("notification_created", async (msg) => {
        try {
            console.log("[Notification Subscriber] Received message:", msg);
            fastify.log.info(
                "Received notification_created event from broker",
                msg
            );

            const { token, eventType, data } = msg;

            if (!token || !eventType || !data) {
                console.log(
                    "[Notification Subscriber] Missing required fields",
                    msg
                );
                fastify.log.error(
                    "Missing required fields in broker message: token, eventType, data",
                    msg
                );
                return;
            }

            const { getNotificationTemplate } = await import("./templates.js"); // Dynamic import
            const language = data.language === "fr" ? "fr" : "en";
            const template = getNotificationTemplate(eventType, data, language);

            if (!template) {
                console.log(
                    `[Notification Subscriber] Invalid eventType or template not found for event: ${eventType}`,
                    msg
                );
                fastify.log.error(
                    `Invalid eventType or template not found for event: ${eventType}`,
                    msg
                );
                return;
            }

            const { sendFCM } = await import("./routes/notificationRouter.js"); // Dynamic import
            try {
                console.log(
                    "[Notification Subscriber] Sending FCM notification",
                    { token, title: template.title, body: template.body, data }
                );
                await sendFCM(token, template.title, template.body, data);
                fastify.log.info(
                    `Notification sent via broker event ${eventType} to token ${token}`
                );
                if (msg.messageId) {
                    broker.acknowledge("notification_created", msg.messageId);
                    fastify.log.info(
                        `Acknowledged messageId: ${msg.messageId}`
                    );
                }
            } catch (error) {
                console.log(
                    "[Notification Subscriber] Error sending FCM notification",
                    error
                );
                fastify.log.error(
                    `Error sending FCM notification via broker for event ${eventType}:`,
                    error
                );
            }
        } catch (err) {
            console.error("[Notification Subscriber] Top-level error:", err);
        }
    });
}
