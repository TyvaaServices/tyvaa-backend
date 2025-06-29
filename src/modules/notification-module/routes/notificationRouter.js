import { getMessaging } from "firebase-admin/messaging";
import createLogger from "./../../../utils/logger.js";
import { getNotificationTemplate } from "../templates.js";

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
        logger.error("Error:", err);
    }
}

async function router(fastify, _options) {
    fastify.post("/send-notification", async (request, reply) => {
        const { token, eventType, data } = request.body;
        if (!token || !eventType || !data) {
            return reply.status(400).send({ error: "Missing required fields: token, eventType, data" });
        }

        const template = getNotificationTemplate(eventType, data);
        if (!template) {
            return reply.status(400).send({ error: "Invalid eventType or template not found" });
        }

        await sendFCM(token, template.title, template.body, data);
        reply.send({ status: "Notification sent" });
    });
}

// Example new payload:
// {
//   "token": "device_fcm_token_here",
//   "eventType": "RIDER_ACCEPT_RIDE",
//   "data": {
//     "riderName": "John Doe",
//     "rideDetails": "Details about the ride"
//   }
// }
export default router;
