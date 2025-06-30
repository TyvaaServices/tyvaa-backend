import { Redis } from "@upstash/redis";
import createLogger from "./logger.js"; // Assuming logger is in the same directory

const logger = createLogger("redis-cache-service");

/**
 * @file Provides a singleton Redis client wrapper for caching operations using Upstash Redis.
 * It supports basic get, set, delete operations, and a utility to retrieve data as a Sequelize model instance.
 */

class RedisCacheService {
    /**
     * @private
     * The static instance of the RedisCacheService, ensuring a singleton pattern.
     * @type {RedisCacheService | null}
     */
    static instance = null;

    /**
     * Private constructor to enforce singleton pattern.
     * Initializes the Redis client using environment variables (handled by `Redis.fromEnv()`).
     * @private
     * @throws {Error} If an attempt is made to construct directly more than once.
     */
    constructor() {
        if (RedisCacheService.instance) {
            throw new Error(
                "RedisCacheService is a singleton. Use RedisCacheService.getInstance()."
            );
        }
        try {
            this.redisClient = Redis.fromEnv();
            console.log(
                "Upstash Redis client initialized successfully from environment variables."
            );
        } catch (error) {
            logger.error(
                { error },
                "Failed to initialize Upstash Redis client from environment variables. Caching will be unavailable."
            );
            this.redisClient = null;
        }
    }

    /**
     * Gets the singleton instance of the RedisCacheService.
     * If an instance doesn't exist, it creates one.
     * @returns {RedisCacheService} The singleton instance.
     */
    static getInstance() {
        if (!RedisCacheService.instance) {
            RedisCacheService.instance = new RedisCacheService();
        }
        return RedisCacheService.instance;
    }

    /**
     * Tests the Redis connection by performing a simple set and get operation.
     * Logs the result and returns true if successful, false otherwise.
     * @static
     * @returns {Promise<boolean>} True if the connection test succeeds, false otherwise.
     */
    static async testConnection() {
        try {
            const instance = RedisCacheService.getInstance();
            if (!instance.redisClient) {
                logger.error(
                    "Redis client is not initialized. Upstash Redis is not available."
                );
                return false;
            }
            // Try a simple ping or set/get
            await instance.redisClient.set("__redis_test__", "ok", { ex: 10 });
            const value = await instance.redisClient.get("__redis_test__");
            if (value === "ok") {
                console.log(
                    "Redis connection test succeeded. Upstash Redis is reachable."
                );
                return true;
            } else {
                console.log(
                    "Redis connection test failed: test value not found."
                );
                return false;
            }
        } catch (err) {
            console.log({ err }, "Redis connection test failed with error.");
            return false;
        }
    }

    /**
     * Retrieves a value from the cache by key.
     * The value is expected to be JSON-stringified and will be parsed.
     * @param {string} key - The cache key.
     * @returns {Promise<any|null>} The parsed value, or null if the key is not found or an error occurs.
     */
    async get(key) {
        if (!this.redisClient) {
            console.log(`Redis client not available. Cannot GET key: ${key}`);
            return null;
        }
        try {
            const data = await this.redisClient.get(key);
            logger.info(`Redis GET key: ${key} | value: ${data}`);
            if (data === null || data === undefined) {
                logger.warn(`Redis key not found: ${key}`);
                return null;
            }
            return JSON.parse(data); // Assumes data is stored as a JSON string
        } catch (error) {
            console.log(
                { error, key },
                `Error getting value from Redis for key: ${key}`
            );
            return null; // Or re-throw, depending on error handling strategy
        }
    }

    /**
     * Stores a value in the cache with an optional Time-To-Live (TTL).
     * The value will be JSON-stringified before storing.
     * @param {string} key - The cache key.
     * @param {any} value - The value to store. Must be JSON-serializable.
     * @param {number} [ttlSeconds=3600] - Optional TTL in seconds (defaults to 1 hour).
     * @returns {Promise<boolean>} True if set successfully, false otherwise.
     */
    async set(key, value, ttlSeconds = 3600) {
        if (!this.redisClient) {
            console.log(`Redis client not available. Cannot SET key: ${key}`);
            return false;
        }
        try {
            const jsonValue = JSON.stringify(value);
            const result = await this.redisClient.set(key, jsonValue, {
                ex: ttlSeconds,
            });
            console.log(
                `Redis SET key: ${key} | value: ${jsonValue} | result: ${result}`
            );
            return result === "OK";
        } catch (error) {
            console.log(
                { error, key },
                `Error setting value in Redis for key: ${key}`
            );
            return false;
        }
    }

    /**
     * Deletes a key (or keys) from the cache.
     * @param {string | string[]} keyOrKeys - A single key or an array of keys to delete.
     * @returns {Promise<number>} The number of keys that were removed.
     */
    async del(keyOrKeys) {
        if (!this.redisClient) {
            logger.warn(
                `Redis client not available. Cannot DEL key(s): ${keyOrKeys}`
            );
            return 0;
        }
        try {
            return await this.redisClient.del(keyOrKeys);
        } catch (error) {
            logger.error(
                { error, keyOrKeys },
                `Error deleting key(s) from Redis: ${keyOrKeys}`
            );
            return 0;
        }
    }

    /**
     * Retrieves data from cache and optionally builds a Sequelize model instance.
     * Useful for caching Sequelize model objects.
     * @param {string} key - The cache key.
     * @param {import("sequelize").ModelStatic<import("sequelize").Model>} [SequelizeModel] - Optional Sequelize model constructor.
     *        If provided, the retrieved data will be used to build an instance of this model.
     * @returns {Promise<any|null>} The parsed object, or a Sequelize model instance if `SequelizeModel` is provided,
     *                              or null if not found or an error occurs.
     */
    async getModel(key, SequelizeModel) {
        const jsonData = await this.get(key); // Uses the refined get method
        if (jsonData === null) return null;

        if (SequelizeModel && typeof SequelizeModel.build === "function") {
            try {
                // Reconstructs a model instance from plain data.
                // { isNewRecord: false } tells Sequelize this represents an existing record.
                return SequelizeModel.build(jsonData, { isNewRecord: false });
            } catch (modelBuildError) {
                logger.error(
                    {
                        error: modelBuildError,
                        key,
                        modelName: SequelizeModel.name,
                    },
                    `Error building Sequelize model instance from cached data for key: ${key}`
                );
                return null; // Or return jsonData if partial success is acceptable
            }
        }
        return jsonData;
    }
}

const redisCacheInstance = RedisCacheService.getInstance();
export default redisCacheInstance;

export { RedisCacheService as RedisCache };
