import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../src/config/db.js", () => ({
    __esModule: true,
    default: {
        sync: jest.fn(() => Promise.resolve()),
        authenticate: jest.fn(() => Promise.resolve()),
        close: jest.fn(() => Promise.resolve()),
    },
}));
jest.mock("fastify", () => {
    const fastifyMock = {
        register: jest.fn(function () {
            return this;
        }),
        listen: jest.fn((opts, cb) =>
            setImmediate(() => cb && cb(null, "mock-address"))
        ),
        close: jest.fn(() => Promise.resolve()),
        get: jest.fn(function () {
            return this;
        }),
        log: { error: jest.fn(), info: jest.fn() },
    };
    return () => fastifyMock;
});

describe("startServer", () => {
    let originalEnv;
    let processOnSpy, processExitSpy;

    // Mock Upstash Redis to prevent warnings during app load
    const mockRedisFromEnv = jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        // Add other methods if app.js calls them during startup
    }));
    jest.unstable_mockModule("@upstash/redis", () => ({
        Redis: { fromEnv: mockRedisFromEnv },
    }));


    beforeAll(() => {
        originalEnv = { ...process.env }; // Shallow copy to restore later
        process.env.NODE_ENV = "test";
        // Mock any other critical env vars if app.js depends on them for startup
        // e.g., process.env.RABBITMQ_URL = "amqp://localhosttest";
        // process.env.FIREBASE_KEY_BASE64 = "mockbase64key"; // If notification module init runs

        processOnSpy = jest.spyOn(process, "on").mockImplementation(() => process);
        processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit called"); });

    });
    afterAll(() => {
        process.env = originalEnv; // Restore original environment variables
        processOnSpy.mockRestore();
        processExitSpy.mockRestore();
        jest.resetModules(); // Important to clear mocks for other test files
    });

    it("should start and close the server without error", async () => {
        const { startServer } = await import("../../src/app.js");
        const server = await startServer();
        expect(server).toBeDefined();
        await server.close();
    }, 15000);

    it("should handle listen error", async () => {
        jest.resetModules();
        jest.doMock("fastify", () => {
            const fastifyMock = {
                register: jest.fn(function () {
                    return this;
                }),
                listen: jest.fn((opts, cb) =>
                    setImmediate(() => cb && cb(new Error("fail")))
                ),
                close: jest.fn(() => Promise.resolve()),
                get: jest.fn(function () {
                    return this;
                }),
                log: { error: jest.fn(), info: jest.fn() },
            };
            return () => fastifyMock;
        });
        const { startServer } = await import("../../src/app.js");
        await expect(startServer()).rejects.toThrow("fail");
    }, 15000);

    afterAll(async () => {
        jest.clearAllMocks();
    });
});
