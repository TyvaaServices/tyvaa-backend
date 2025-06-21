import {getMessaging} from "firebase-admin/messaging";
import createLogger from './../../../utils/logger.js';

const logger = createLogger('notification-router');

async function sendFCM(token, title, body, data) {
    const message = {
        token: token,
        notification: {
            title: title,
            body: body,
        },
        data: data,
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

async function router(fastify, options) {
    fastify.post("/send-notification", async (request, reply) => {
        const {token, title, body, data} = request.body;
        if (!token || !title || !body) {
            return reply.status(400).send({error: "Missing required fields"});
        }
        await sendFCM(token, title, body, data || {});
        reply.send({status: "Notification sent"});
    });
}

// {
//   "token": "",
//     "title": "Test Notification",
//     "body": "This is a test message from Postman",
//     "data": {
//   "type": "test",
//       "id": "12345",
//       "route": "/test-screen"
// }
// }
export default router;
