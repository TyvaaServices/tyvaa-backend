import { Redis } from '@upstash/redis';

class RedisCache {
    constructor() {
        if (!RedisCache.instance) {
            this.redis = Redis.fromEnv();
            RedisCache.instance = this;
        }
        return RedisCache.instance;
    }z

    async get(key) {
        const data = await this.redis.get(key);
        if (!data) return null;
        return JSON.parse(data);
    }

    async set(key, value, ttl = 60) {
        const json = JSON.stringify(value);
        return await this.redis.set(key, json, { ex: ttl });
    }

    async del(key) {
        return await this.redis.del(key);
    }

    async getModel(key, Model) {
        const json = await this.redis.get(key);
        if (!json) return null;

        const obj = JSON.parse(json);
        if (Model) {
            return Model.build(obj, { isNewRecord: false });
        }
        return obj;
    }
}

export default new RedisCache();