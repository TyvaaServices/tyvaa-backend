import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";

const mockRegister = jest.fn();
const mockDecorate = jest.fn();

let jwtPlugin;
beforeAll(async () => {
    jwtPlugin =
        (await import("../../src/utils/jwt.js")).default ||
        (await import("../../src/utils/jwt.js"));
});

describe("jwt plugin", () => {
    let fastify;
    beforeEach(() => {
        fastify = {
            register: mockRegister,
            decorate: mockDecorate,
            jwt: { sign: jest.fn(() => "token"), verify: jest.fn() },
            log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() }, // Added for fastify.log
        };
        mockRegister.mockClear();
        mockDecorate.mockClear();
    });

    it("registers fastify-jwt and decorates authenticate and signToken", () => {
        const done = jest.fn();
        jwtPlugin(fastify, {}, done);
        expect(mockRegister).toHaveBeenCalled();
        expect(mockDecorate).toHaveBeenCalledWith(
            "authenticate",
            expect.any(Function)
        );
        expect(mockDecorate).toHaveBeenCalledWith(
            "signToken",
            expect.any(Function)
        );
        expect(done).toHaveBeenCalled();
    });

    it("authenticate calls jwtVerify and passes", async () => {
        let authFn;
        mockDecorate.mockImplementation((name, fn) => {
            if (name === "authenticate") authFn = fn;
        });
        jwtPlugin(fastify, {}, () => {});
        const request = { jwtVerify: jest.fn() };
        const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
        await authFn.call(fastify, request, reply);
        expect(request.jwtVerify).toHaveBeenCalled();
    });

    it("authenticate handles error", async () => {
        let authFn;
        mockDecorate.mockImplementation((name, fn) => {
            if (name === "authenticate") authFn = fn;
        });
        jwtPlugin(fastify, {}, () => {});
        const error = new Error("JWT verification failed"); // More specific error message
        const request = {
            jwtVerify: jest.fn().mockRejectedValue(error),
            log: {
                warn: jest.fn(),
                error: jest.fn(),
                info: jest.fn(),
                debug: jest.fn(),
            },
            ip: "127.0.0.1",
        };
        const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };

        const { AuthenticationError: ActualAuthenticationError } = await import(
            "../../src/utils/customErrors.js"
        );

        try {
            await authFn.call(fastify, request, reply);
            throw new Error(
                "Test failed: authenticate should have thrown AuthenticationError."
            );
        } catch (e) {
            expect(e).toBeInstanceOf(ActualAuthenticationError);
            expect(e.message).toBe(`Authentication failed: ${error.message}`);
        }

        expect(request.log.warn).toHaveBeenCalledWith(
            { error: error.message, ip: request.ip },
            "JWT authentication failed."
        );
        expect(reply.code).not.toHaveBeenCalled();
        expect(reply.send).not.toHaveBeenCalled();
    });

    it("signToken calls jwt.sign", () => {
        let signTokenFn;
        mockDecorate.mockImplementation((name, fn) => {
            if (name === "signToken") signTokenFn = fn;
        });
        jwtPlugin(fastify, {}, () => {});
        fastify.jwt.sign.mockReturnValue("signed");
        const result = signTokenFn.call(fastify, { foo: "bar" });
        expect(result).toBe("signed");
    });

    it("warns if JWT_SECRET is not set", () => {
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET; // Temporarily unset

        const done = jest.fn();
        jwtPlugin(fastify, {}, done);

        expect(fastify.log.warn).toHaveBeenCalledWith(
            "JWT_SECRET environment variable is not set. Using a default, insecure secret. THIS IS NOT SUITABLE FOR PRODUCTION."
        );

        process.env.JWT_SECRET = originalSecret;
        expect(done).toHaveBeenCalled();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });
});
