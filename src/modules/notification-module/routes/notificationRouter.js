import { getMessaging } from "firebase-admin/messaging";
import createLogger from "./../../../utils/logger.js";

const logger = createLogger("notification-router");

export async function sendFCM(token, title, body, data) {
    const message = {
        token,
        notification: {
            title,
            body,
        },
        data,
        android: {
            priority: "high",
            notification: {
                channelId: "high_importance_channel",
                sound: "default",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                },
            },
        },
    };

    try {
        const response = await getMessaging().send(message);
        logger.info("Notification sent:", response);
    } catch (err) {
        logger.error("Raw FCM error:", err);
        logger.error("Error sending FCM notification:", {
            error: err && (err.stack || err.message || err),
            errorString: JSON.stringify(err, Object.getOwnPropertyNames(err)),
            token,
            title,
            body,
            data,
        });
    }
}

async function router(fastify) {
    fastify.post("/send-notification", async (request, reply) => {
        const { token, eventType, data } = request.body;
        if (!token || !eventType || !data) {
            return reply.status(400).send({
                error: "Missing required fields: token, eventType, data",
            });
        }
        const { getNotificationTemplate } = await import("./../templates.js"); // Dynamic import
        const language = data.language === "fr" ? "fr" : "en";
        const template = getNotificationTemplate(eventType, data, language);
        if (!template) {
            return reply
                .status(400)
                .send({ error: "Invalid eventType or template not found" });
        }

        await sendFCM(token, template.title, template.body, data);
        reply.send({ status: "Notification sent" });
    });
}

export default router;
