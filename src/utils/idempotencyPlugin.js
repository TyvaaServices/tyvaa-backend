import redis from "./redisCache.js";

export default async function idempotencyPlugin(fastify, opts) {
    fastify.addHook("onRequest", async (request, reply) => {
        if (!["POST"].includes(request.method)) return;
        const key = request.headers["idempotency-key"];
        if (!key) return;
        const cached = await redis.get(`idempotency:${key}`);
        if (cached) {
            const { status, payload, headers } = cached;
            if (headers)
                Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
            reply.code(status).send(payload);
        }
    });

    fastify.addHook("onSend", async (request, reply, payload) => {
        if (!["POST"].includes(request.method)) return payload;
        const key = request.headers["idempotency-key"];
        if (!key) return payload;
        const redisKey = `idempotency:${key}`;
        const exists = await redis.get(redisKey);
        if (!exists) {
            await redis.set(
                redisKey,
                {
                    status: reply.statusCode,
                    payload: payload,
                    headers: reply.getHeaders(),
                },
                24 * 3600
            );
        }
        return payload;
    });
}
