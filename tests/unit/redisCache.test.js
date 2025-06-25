import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
};
const mockFromEnv = jest.fn(() => mockRedis);

jest.unstable_mockModule("@upstash/redis", () => ({
    Redis: { fromEnv: mockFromEnv },
}));

// Mock the logger
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerInfo = jest.fn(); // Although info might not be checked as much here
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
    __esModule: true,
    default: jest.fn(() => ({
        error: mockLoggerError,
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
    })),
}));

let RedisCacheService, redisCacheInstanceDefaultExport;

describe("RedisCacheService", () => {
    // Changed describe name to match class
    beforeEach(async () => {
        // Made beforeEach async to handle potential dynamic imports if needed
        jest.clearAllMocks(); // Clear all mocks: redis, logger etc.

        // Resetting the singleton instance for each test is crucial
        // This allows testing constructor logic multiple times under different conditions.
        // We need to re-import the module to get a fresh state because it exports a singleton instance.
        jest.resetModules();

        // Re-mock @upstash/redis for each test after resetModules
        // to ensure our mockRedis and mockFromEnv are used by the fresh import.
        mockRedis.get.mockReset();
        mockRedis.set.mockReset();
        mockRedis.del.mockReset();
        mockFromEnv.mockReset().mockReturnValue(mockRedis); // Ensure it returns the mockRedis by default

        jest.unstable_mockModule("@upstash/redis", () => ({
            Redis: { fromEnv: mockFromEnv },
        }));

        // Re-mock the logger for the fresh import
        mockLoggerError.mockClear();
        mockLoggerWarn.mockClear();
        mockLoggerInfo.mockClear();
        jest.unstable_mockModule("../../src/utils/logger.js", () => ({
            __esModule: true,
            default: jest.fn(() => ({
                error: mockLoggerError,
                warn: mockLoggerWarn,
                info: mockLoggerInfo,
            })),
        }));

        const mod = await import("../../src/utils/redisCache.js");
        RedisCacheService = mod.RedisCache; // The class
        redisCacheInstanceDefaultExport = mod.default; // The singleton instance created on module load
    });

    it("enforces singleton through direct instantiation attempt after getInstance", () => {
        // getInstance will create the first instance
        const instance1 = RedisCacheService.getInstance();
        expect(instance1).toBeInstanceOf(RedisCacheService);
        // Attempting to create another one directly should throw
        expect(() => new RedisCacheService()).toThrow(
            "RedisCacheService is a singleton. Use RedisCacheService.getInstance()."
        );
    });

    it("getInstance returns the same instance", () => {
        const instance1 = RedisCacheService.getInstance();
        const instance2 = RedisCacheService.getInstance();
        expect(instance1).toBe(instance2);
        expect(mockFromEnv).toHaveBeenCalledTimes(1); // fromEnv should only be called once for the singleton
    });

    describe("Constructor Logic", () => {
        it("should log an error and have a null redisClient if Redis.fromEnv throws", async () => {
            jest.resetModules(); // Ensure clean slate for this specific module loading test
            const fromEnvError = new Error("Failed to init from env");

            // Mock @upstash/redis to throw for this test only
            jest.unstable_mockModule("@upstash/redis", () => ({
                Redis: {
                    fromEnv: jest.fn(() => {
                        throw fromEnvError;
                    }),
                },
            }));
            // Re-mock logger as well after reset
            const localMockLoggerError = jest.fn();
            jest.unstable_mockModule("../../src/utils/logger.js", () => ({
                __esModule: true,
                default: jest.fn(() => ({
                    error: localMockLoggerError,
                    warn: jest.fn(),
                    info: jest.fn(),
                })),
            }));

            const {
                default: freshInstance,
                RedisCache: FreshRedisCacheService,
            } = await import("../../src/utils/redisCache.js");

            expect(localMockLoggerError).toHaveBeenCalledWith(
                { error: fromEnvError },
                "Failed to initialize Upstash Redis client from environment variables. Caching will be unavailable."
            );
            expect(freshInstance.redisClient).toBeNull();

            // Test that methods handle null redisClient
            expect(await freshInstance.get("key")).toBeNull();
            expect(await freshInstance.set("key", "value")).toBe(false);
            expect(await freshInstance.del("key")).toBe(0);
            // Check for warnings when methods are called with null client
            expect(
                localMockLoggerError.mock.calls.length
            ).toBeGreaterThanOrEqual(1); // At least the constructor error
        });
    });

    it("get returns parsed data", async () => {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify({ foo: "bar" }));
        const result = await redisCacheInstanceDefaultExport.get("key");
        expect(result).toEqual({ foo: "bar" });
    });

    it("get returns null if not found", async () => {
        mockRedis.get.mockResolvedValueOnce(null);
        const result = await redisCacheInstanceDefaultExport.get("key");
        expect(result).toBeNull();
    });

    it("set stringifies and sets value", async () => {
        mockRedis.set.mockResolvedValueOnce("OK");
        const result = await redisCacheInstanceDefaultExport.set(
            "key",
            { foo: "bar" },
            100
        );
        expect(mockRedis.set).toHaveBeenCalledWith(
            "key",
            JSON.stringify({ foo: "bar" }),
            { ex: 100 }
        );
        expect(result).toBe(true);
    });

    it("del calls redis.del", async () => {
        mockRedis.del.mockResolvedValueOnce(1);
        const result = await redisCacheInstanceDefaultExport.del("key");
        expect(mockRedis.del).toHaveBeenCalledWith("key");
        expect(result).toBe(1);
    });

    it("getModel returns built model if Model provided", async () => {
        const obj = { foo: "bar" };
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(obj));
        const Model = {
            name: "TestModel",
            build: jest.fn((o, opts) => ({ ...o, opts })),
        }; // Added name to mock Model
        const result = await redisCacheInstanceDefaultExport.getModel(
            "key",
            Model
        );
        expect(Model.build).toHaveBeenCalledWith(obj, { isNewRecord: false });
        expect(result).toEqual({ foo: "bar", opts: { isNewRecord: false } });
    });

    it("getModel returns null if not found", async () => {
        mockRedis.get.mockResolvedValueOnce(null);
        const result = await redisCacheInstanceDefaultExport.getModel("key");
        expect(result).toBeNull();
    });

    // Add tests for error paths in get, set, del, getModel
    describe("Method Error Handling", () => {
        it("get should log error and return null if redisClient.get fails", async () => {
            const redisError = new Error("Redis GET failed");
            mockRedis.get.mockRejectedValueOnce(redisError);
            const result = await redisCacheInstanceDefaultExport.get("key1");
            expect(result).toBeNull();
            expect(mockLoggerError).toHaveBeenCalledWith(
                { error: redisError, key: "key1" },
                "Error getting value from Redis for key: key1"
            );
        });

        it("set should log error and return false if redisClient.set fails", async () => {
            const redisError = new Error("Redis SET failed");
            mockRedis.set.mockRejectedValueOnce(redisError);
            const result = await redisCacheInstanceDefaultExport.set(
                "key2",
                "value"
            );
            expect(result).toBe(false);
            expect(mockLoggerError).toHaveBeenCalledWith(
                { error: redisError, key: "key2" },
                "Error setting value in Redis for key: key2"
            );
        });

        it("del should log error and return 0 if redisClient.del fails", async () => {
            const redisError = new Error("Redis DEL failed");
            mockRedis.del.mockRejectedValueOnce(redisError);
            const result = await redisCacheInstanceDefaultExport.del("key3");
            expect(result).toBe(0);
            expect(mockLoggerError).toHaveBeenCalledWith(
                { error: redisError, keyOrKeys: "key3" },
                "Error deleting key(s) from Redis: key3"
            );
        });

        it("getModel should log error and return null if Model.build fails", async () => {
            const modelData = { id: 1, name: "Test" };
            mockRedis.get.mockResolvedValueOnce(JSON.stringify(modelData));
            const modelBuildError = new Error("Model.build failed");
            const MockModel = {
                name: "MyModel",
                build: jest.fn(() => {
                    throw modelBuildError;
                }),
            };

            const result = await redisCacheInstanceDefaultExport.getModel(
                "key4",
                MockModel
            );
            expect(result).toBeNull();
            expect(mockLoggerError).toHaveBeenCalledWith(
                { error: modelBuildError, key: "key4", modelName: "MyModel" },
                "Error building Sequelize model instance from cached data for key: key4"
            );
        });
    });

    afterAll(async () => {
        jest.clearAllMocks(); // General cleanup
    });
});
