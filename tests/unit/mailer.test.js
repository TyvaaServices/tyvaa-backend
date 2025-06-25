import {
    jest,
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    afterAll,
} from "@jest/globals";

const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerInfo = jest.fn();
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
    __esModule: true,
    default: jest.fn(() => ({
        error: mockLoggerError,
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
    })),
}));

describe("Mailer Utility", () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        mockLoggerError.mockClear();
        mockLoggerWarn.mockClear();
        mockLoggerInfo.mockClear();
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    const setupNodemailerMock = (
        verifyCallback = (cb) => cb(null, "success")
    ) => {
        const mockVerify = jest.fn(verifyCallback);
        const mockCreateTransport = jest.fn(() => ({
            verify: mockVerify,
        }));
        jest.unstable_mockModule("nodemailer", () => ({
            __esModule: true,
            default: {
                createTransport: mockCreateTransport,
            },
        }));
        return { mockCreateTransport, mockVerify };
    };

    it("should create a transporter and verify successfully with SMTP_PORT 587 (SMTP_SECURE not set)", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASS = "pass";
        const { mockCreateTransport, mockVerify } = setupNodemailerMock();
        const mailerModule = await import("../../src/utils/mailer.js");

        expect(mockCreateTransport).toHaveBeenCalledWith({
            host: "smtp.example.com",
            port: 587,
            secure: false,
            auth: { user: "user", pass: "pass" },
        });
        expect(mockVerify).toHaveBeenCalled();
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            "Nodemailer transporter configured and verified successfully. Ready to send emails."
        );
        expect(mailerModule.default).toBeDefined();
    });

    it("should create a transporter with secure: true for SMTP_PORT 465 (SMTP_SECURE not set)", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_PORT = "465";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASS = "pass";
        const { mockCreateTransport } = setupNodemailerMock();
        await import("../../src/utils/mailer.js");

        expect(mockCreateTransport).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 465,
                secure: true,
            })
        );
    });

    it("should use SMTP_SECURE='true' when set, overriding port-based default", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASS = "pass";
        process.env.SMTP_SECURE = "true";

        const { mockCreateTransport } = setupNodemailerMock();
        await import("../../src/utils/mailer.js");

        expect(mockCreateTransport).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 587,
                secure: true,
            })
        );
    });

    it("should use SMTP_SECURE='false' when set, overriding port-based default", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_PORT = "465"; // Typically secure port
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASS = "pass";
        process.env.SMTP_SECURE = "false";

        const { mockCreateTransport } = setupNodemailerMock();
        await import("../../src/utils/mailer.js");

        expect(mockCreateTransport).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 465,
                secure: false,
            })
        );
    });

    it("should log a warning and set transporter to null if SMTP env vars are incomplete", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        setupNodemailerMock();
        const mailerModule = await import("../../src/utils/mailer.js");

        expect(mockLoggerWarn).toHaveBeenCalledWith(
            "SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS) is incomplete. " +
                "Email functionality will be disabled. Check environment variables."
        );
        expect(mailerModule.default).toBeNull();
    });

    it("should log an error and set transporter to null if transporter.verify fails", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASS = "pass";

        const verifyError = new Error("Verification failed");
        const { mockVerify } = setupNodemailerMock((cb) => cb(verifyError));
        const mailerModule = await import("../../src/utils/mailer.js");

        expect(mockVerify).toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith(
            { error: verifyError },
            "Nodemailer transporter verification failed. Emails may not send."
        );
        expect(mailerModule.default).toBeNull();
    });

    it("should log an error and set transporter to null if nodemailer.createTransport throws", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASS = "pass";

        const createTransportError = new Error("Create transport failed");
        jest.unstable_mockModule("nodemailer", () => ({
            __esModule: true,
            default: {
                createTransport: jest.fn(() => {
                    throw createTransportError;
                }),
            },
        }));

        const mailerModule = await import("../../src/utils/mailer.js");

        expect(mockLoggerError).toHaveBeenCalledWith(
            { error: createTransportError },
            "Critical error during Nodemailer transporter setup. Email functionality disabled."
        );
        expect(mailerModule.default).toBeNull();
    });
    it("should handle default port to 465 if SMTP_SECURE is not 'false' and SMTP_PORT is not set", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASS = "pass";

        const { mockCreateTransport } = setupNodemailerMock();
        await import("../../src/utils/mailer.js");

        expect(mockCreateTransport).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 465,
                secure: true,
            })
        );
    });

    it("should handle default port to 587 if SMTP_SECURE is 'false' and SMTP_PORT is not set", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASS = "pass";
        process.env.SMTP_SECURE = "false";
        const { mockCreateTransport } = setupNodemailerMock();
        await import("../../src/utils/mailer.js");

        expect(mockCreateTransport).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 587, // Default for non-secure
                secure: false,
            })
        );
    });
});
