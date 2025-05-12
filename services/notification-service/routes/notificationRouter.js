
const { getMessaging } = require("firebase-admin/messaging");
async function sendFCM(token, title, body) {
    const message = {
        token: token,
        notification: {
            title: title,
            body: body,
        },
        android: {
            priority: "high",
            notification: {
                channelId: "high_importance_channel",
                sound: "default",
            }
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
        console.log("✅ Notification sent:", response);
    } catch (err) {
        console.error("❌ Error:", err);
    }
}

async function router(fastify, options) {
    fastify.post("/send-notification", async (request, reply) => {
        const { token, title, body } = request.body;
        if (!token || !title || !body) {
            return reply.status(400).send({ error: "Missing required fields" });
        }
        await sendFCM(token, title, body);
        reply.send({ status: "Notification sent" });
    });
}
module.exports = router;