import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockPinoInstanceMethods = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
};
const mockPinoConstructor = jest.fn(() => mockPinoInstanceMethods);
mockPinoConstructor.destination = jest.fn();
mockPinoConstructor.transport = jest.fn();
mockPinoConstructor.stdTimeFunctions = { isoTime: "mock-iso-time" };

const mockFsExistsSync = jest.fn();
const mockFsMkdirSync = jest.fn();

describe("createLogger", () => {
    let originalNodeEnv;
    let originalLogLevel;

    beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
        originalLogLevel = process.env.LOG_LEVEL;

        mockPinoConstructor.mockClear();
        mockPinoConstructor.destination.mockClear();
        mockPinoConstructor.transport.mockClear();
        Object.values(mockPinoInstanceMethods).forEach((mockFn) =>
            mockFn.mockClear()
        );
        mockFsExistsSync.mockClear();
        mockFsMkdirSync.mockClear();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalLogLevel === undefined) {
            delete process.env.LOG_LEVEL;
        } else {
            process.env.LOG_LEVEL = originalLogLevel;
        }
        jest.resetModules();
    });

    async function setupMocksAndImportLogger() {
        jest.resetModules();
        jest.unstable_mockModule("pino", () => ({
            __esModule: true,
            pino: mockPinoConstructor,
        }));
        jest.unstable_mockModule("fs", () => ({
            default: {
                existsSync: mockFsExistsSync,
                mkdirSync: mockFsMkdirSync,
            },
            existsSync: mockFsExistsSync,
            mkdirSync: mockFsMkdirSync,
        }));
        const loggerModule = await import("../../src/utils/logger.js");
        return loggerModule.default;
    }

    it("should create logs directory if it does not exist", async () => {
        mockFsExistsSync.mockReturnValue(false); 
        const createLogger = await setupMocksAndImportLogger();
        createLogger("any-service");
        const expectedLogDir = path.resolve(__dirname, "..", "..", "logs");
        expect(mockFsExistsSync).toHaveBeenCalledWith(expectedLogDir);
        expect(mockFsMkdirSync).toHaveBeenCalledWith(expectedLogDir, {
            recursive: true,
        });
    });

    it("should not attempt to create logs directory if it exists", async () => {
        mockFsExistsSync.mockReturnValue(true); 
        const createLogger = await setupMocksAndImportLogger();
        createLogger("any-service");
        expect(mockFsMkdirSync).not.toHaveBeenCalled();
    });

    it("should configure pino with file destination in production", async () => {
        process.env.NODE_ENV = "production";
        process.env.LOG_LEVEL = "info";
        mockFsExistsSync.mockReturnValue(true); 

        const createLogger = await setupMocksAndImportLogger();
        const logger = createLogger("prod-service");

        expect(mockPinoConstructor).toHaveBeenCalledTimes(1);
        expect(mockPinoConstructor.destination).toHaveBeenCalledTimes(1);
        const expectedLogPath = path.join(
            path.resolve(__dirname, "..", "..", "logs"),
            "prod-service.log"
        );
        expect(mockPinoConstructor.destination).toHaveBeenCalledWith({
            dest: expectedLogPath,
            sync: false,
            mkdir: true,
        });

        expect(mockPinoConstructor.mock.calls[0][1]).toBe(
            mockPinoConstructor.destination.mock.results[0].value
        );
        expect(mockPinoConstructor.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                level: "info",
                base: { service: "prod-service", pid: process.pid },
            })
        );
        expect(logger).toBeDefined();
    });

    it("should configure pino with transport in development", async () => {
        process.env.NODE_ENV = "development";
        process.env.LOG_LEVEL = "debug";
        mockFsExistsSync.mockReturnValue(true);

        const createLogger = await setupMocksAndImportLogger();
        const logger = createLogger("dev-service");

        expect(mockPinoConstructor).toHaveBeenCalledTimes(1);
        expect(mockPinoConstructor.transport).toHaveBeenCalledTimes(1);

        const expectedLogPath = path.join(
            path.resolve(__dirname, "..", "..", "logs"),
            "dev-service.log"
        );
        expect(mockPinoConstructor.transport).toHaveBeenCalledWith({
            targets: [
                expect.objectContaining({
                    target: "pino-pretty",
                    level: "debug",
                }),
                expect.objectContaining({
                    target: "pino/file",
                    options: { destination: expectedLogPath, mkdir: true },
                    level: "trace",
                }),
            ],
        });
        expect(mockPinoConstructor.mock.calls[0][1]).toBe(
            mockPinoConstructor.transport.mock.results[0].value
        );
        expect(mockPinoConstructor.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                level: "debug",
                base: { service: "dev-service", pid: process.pid },
            })
        );
        expect(logger).toBeDefined();
    });

    it("should use default service name 'application' if none provided", async () => {
        process.env.NODE_ENV = "development";
        delete process.env.LOG_LEVEL;
        mockFsExistsSync.mockReturnValue(true);

        const createLogger = await setupMocksAndImportLogger();
        createLogger();
        expect(mockPinoConstructor.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                base: { service: "application", pid: process.pid },
            })
        );
    });

    it("should use LOG_LEVEL from env if set, overriding NODE_ENV default", async () => {
        process.env.NODE_ENV = "production";
        process.env.LOG_LEVEL = "warn";
        mockFsExistsSync.mockReturnValue(true);

        const createLogger = await setupMocksAndImportLogger();
        createLogger("service-log-level");

        expect(mockPinoConstructor.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                level: "warn",
            })
        );
    });

    it("should sanitize service name for log file path", async () => {
        process.env.NODE_ENV = "production";
        mockFsExistsSync.mockReturnValue(true);

        const createLogger = await setupMocksAndImportLogger();
        createLogger("My Service!@#$%^&*()_+");

        const expectedLogPath = path.join(
            path.resolve(__dirname, "..", "..", "logs"),
            "my_service____________.log"
        );
        expect(mockPinoConstructor.destination).toHaveBeenCalledWith(
            expect.objectContaining({
                dest: expectedLogPath,
            })
        );
    });
});
