import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import errorHandlerPlugin from "../../src/utils/errorHandler.js";

const mockAppError = class AppError extends Error {
    constructor(message, statusCode = 500, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        if (details) this.details = details;
    }
};
const mockNotFoundError = class NotFoundError extends mockAppError {
    constructor(message = "Not found", details) {
        super(message, 404, details);
    }
};

jest.unstable_mockModule("../../src/utils/customErrors.js", () => ({
    AppError: mockAppError,
    NotFoundError: mockNotFoundError,
}));

describe("errorHandlerPlugin", () => {
    let fastify;
    let setErrorHandler;
    beforeEach(() => {
        setErrorHandler = jest.fn();
        fastify = { setErrorHandler };
    });

    it("should register error handler", async () => {
        await errorHandlerPlugin(fastify);
        expect(setErrorHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle AppError and send correct response", async () => {
        await errorHandlerPlugin(fastify);
        const handler = setErrorHandler.mock.calls[0][0];
        const error = new mockNotFoundError("User not found", { foo: "bar" });
        const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        handler(error, {}, reply);
        expect(reply.status).toHaveBeenCalledWith(404);
        expect(reply.send).toHaveBeenCalledWith(
            expect.objectContaining({
                error: "NotFoundError",
                message: "User not found",
                details: { foo: "bar" },
            })
        );
    });

    it("should handle generic error with statusCode", async () => {
        await errorHandlerPlugin(fastify);
        const handler = setErrorHandler.mock.calls[0][0];
        const error = { name: "SomeError", message: "Oops", statusCode: 400 };
        const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        handler(error, {}, reply);
        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith({
            error: "SomeError",
            message: "Oops",
        });
    });

    it("should handle unknown error and return 500", async () => {
        await errorHandlerPlugin(fastify);
        const handler = setErrorHandler.mock.calls[0][0];
        const error = new Error("fail");
        const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        handler(error, {}, reply);
        expect(reply.status).toHaveBeenCalledWith(500);
        expect(reply.send).toHaveBeenCalledWith({
            error: "InternalServerError",
            message: "An unexpected error occurred.",
        });
    });
});
