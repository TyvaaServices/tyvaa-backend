jest.mock('../../src/config/db.js', () => ({
    __esModule: true,
    default: {
        sync: jest.fn(() => Promise.resolve()),
        authenticate: jest.fn(() => Promise.resolve()),
        close: jest.fn(() => Promise.resolve()),
    }
}));
jest.mock('fastify', () => {
    const fastifyMock = {
        register: jest.fn(function () { return this; }),
        listen: jest.fn((opts, cb) => setImmediate(() => cb && cb(null, 'mock-address'))),
        close: jest.fn(() => Promise.resolve()),
        get: jest.fn(function () { return this; }),
        log: { error: jest.fn(), info: jest.fn() },
    };
    return () => fastifyMock;
});

import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";

describe('startServer', () => {
    let originalEnv;
    let processOnSpy, processExitSpy;
    beforeAll(() => {
        originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => {});
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    });
    afterAll(() => {
        process.env.NODE_ENV = originalEnv;
        processOnSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    it('should start and close the server without error', async () => {
        const { startServer } = await import('../../src/app.js');
        const server = await startServer();
        expect(server).toBeDefined();
        await server.close();
    }, 15000);

    it('should handle listen error', async () => {
        jest.resetModules();
        jest.doMock('fastify', () => {
            const fastifyMock = {
                register: jest.fn(function () { return this; }),
                listen: jest.fn((opts, cb) => setImmediate(() => cb && cb(new Error('fail')))),
                close: jest.fn(() => Promise.resolve()),
                get: jest.fn(function () { return this; }),
                log: { error: jest.fn(), info: jest.fn() },
            };
            return () => fastifyMock;
        });
        const { startServer } = await import('../../src/app.js');
        await expect(startServer()).rejects.toThrow('fail');
    }, 15000);

    afterAll(async () => {
        jest.clearAllMocks();
    });
});
