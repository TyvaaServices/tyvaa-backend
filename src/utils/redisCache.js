import {Redis} from '@upstash/redis';

class RedisCache {
    constructor() {
        if (RedisCache.instance) {
            throw new Error("Use RedisCache.getInstance() to get the single instance of this class.");
        }
        this.redis = Redis.fromEnv();
        RedisCache.instance = this;
    }

    static getInstance() {
        if (!RedisCache.instance) {
            RedisCache.instance = new RedisCache();
        }
        return RedisCache.instance;
    }

    async get(key) {
        const data = await this.redis.get(key);
        if (!data) return null;
        return JSON.parse(data);
    }

    async set(key, value, ttl = 60) {
        const json = JSON.stringify(value);
        return await this.redis.set(key, json, {ex: ttl});
    }

    async del(key) {
        return await this.redis.del(key);
    }

    async getModel(key, Model) {
        const json = await this.redis.get(key);
        if (!json) return null;

        const obj = JSON.parse(json);
        if (Model) {
            return Model.build(obj, {isNewRecord: false});
        }
        return obj;
    }
}

const redisCacheInstance = new RedisCache();
export default redisCacheInstance;
export { RedisCache };
