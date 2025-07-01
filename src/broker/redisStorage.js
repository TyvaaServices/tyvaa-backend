import { Redis } from "@upstash/redis";

class RedisStorage {
    constructor() {
        this.redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }

    async save(queue, message) {
        // Debug log to ensure message is always stringified
        console.log(
            "[RedisStorage.save] typeof message:",
            typeof message,
            "value:",
            message
        );
        await this.redis.lpush(queue, JSON.stringify(message));
    }

    async load(queue) {
        const messages = await this.redis.lrange(queue, 0, -1);
        return messages.map((m) => JSON.parse(m));
    }

    async pop(queue) {
        const msg = await this.redis.rpop(queue);
        console.log(
            "[RedisStorage.pop] raw value:",
            msg,
            "typeof:",
            typeof msg
        );
        return msg ? JSON.parse(msg) : null;
    }
}

export default RedisStorage;
