import { describe, it, expect } from "@jest/globals";
import {
    AppError,
    BadRequestError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    InternalServerError,
} from "#utils/customErrors.js";

describe("Custom Errors", () => {
    describe("AppError", () => {
        it("should correctly set properties", () => {
            const error = new AppError("Test message", 499, "TEST_CODE", {
                detail: "value",
            });
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AppError);
            expect(error.message).toBe("Test message");
            expect(error.statusCode).toBe(499);
            expect(error.name).toBe("AppError");
            expect(error.errorCode).toBe("TEST_CODE");
            expect(error.details).toEqual({ detail: "value" });
            expect(error.stack).toBeDefined();
        });

        it("should handle missing optional params", () => {
            const error = new AppError("Test message only", 500);
            expect(error.message).toBe("Test message only");
            expect(error.statusCode).toBe(500);
            expect(error.errorCode).toBeUndefined();
            expect(error.details).toBeUndefined();
        });
    });

    describe("BadRequestError", () => {
        it("should set default properties", () => {
            const error = new BadRequestError();
            expect(error.message).toBe("Bad Request");
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe("BadRequestError");
            expect(error.errorCode).toBe("BAD_REQUEST");
        });
        it("should allow custom message and details", () => {
            const error = new BadRequestError("Custom bad request", {
                field: "email",
            });
            expect(error.message).toBe("Custom bad request");
            expect(error.details).toEqual({ field: "email" });
        });
    });

    describe("AuthenticationError", () => {
        it("should set default properties", () => {
            const error = new AuthenticationError();
            expect(error.message).toBe("Unauthorized");
            expect(error.statusCode).toBe(401);
            expect(error.name).toBe("AuthenticationError");
            expect(error.errorCode).toBe("AUTHENTICATION_FAILURE");
        });
        it("should allow custom message and details", () => {
            const error = new AuthenticationError("Custom auth error", {
                reason: "token_expired",
            });
            expect(error.message).toBe("Custom auth error");
            expect(error.details).toEqual({ reason: "token_expired" });
        });
    });

    describe("ForbiddenError", () => {
        it("should set default properties", () => {
            const error = new ForbiddenError();
            expect(error.message).toBe("Forbidden");
            expect(error.statusCode).toBe(403);
            expect(error.name).toBe("ForbiddenError");
            expect(error.errorCode).toBe("FORBIDDEN_ACCESS");
        });
        it("should allow custom message and details", () => {
            const error = new ForbiddenError("Custom forbidden", {
                resource: "admin_panel",
            });
            expect(error.message).toBe("Custom forbidden");
            expect(error.details).toEqual({ resource: "admin_panel" });
        });
    });

    describe("NotFoundError", () => {
        it("should set default properties", () => {
            const error = new NotFoundError();
            expect(error.message).toBe("Not Found");
            expect(error.statusCode).toBe(404);
            expect(error.name).toBe("NotFoundError");
            expect(error.errorCode).toBe("RESOURCE_NOT_FOUND");
        });
        it("should allow custom message and details", () => {
            const error = new NotFoundError("Custom not found", { id: "123" });
            expect(error.message).toBe("Custom not found");
            expect(error.details).toEqual({ id: "123" });
        });
    });

    describe("ConflictError", () => {
        it("should set default properties", () => {
            const error = new ConflictError();
            expect(error.message).toBe("Conflict");
            expect(error.statusCode).toBe(409);
            expect(error.name).toBe("ConflictError");
            expect(error.errorCode).toBe("RESOURCE_CONFLICT");
        });
        it("should allow custom message and details", () => {
            const error = new ConflictError("Custom conflict", {
                field: "username",
            });
            expect(error.message).toBe("Custom conflict");
            expect(error.details).toEqual({ field: "username" });
        });
    });

    describe("InternalServerError", () => {
        it("should set default properties", () => {
            const error = new InternalServerError();
            expect(error.message).toBe("Internal Server Error");
            expect(error.statusCode).toBe(500);
            expect(error.name).toBe("InternalServerError");
            expect(error.errorCode).toBe("INTERNAL_SERVER_ERROR");
        });
        it("should allow custom message and details", () => {
            const error = new InternalServerError("Custom internal error", {
                traceId: "xyz",
            });
            expect(error.message).toBe("Custom internal error");
            expect(error.details).toEqual({ traceId: "xyz" });
        });
    });

    // Test Error.captureStackTrace branch if possible (usually handled by Node.js env)
    // This is implicitly covered if error.stack is defined and is a string.
    it("AppError should have a stack trace", () => {
        const error = new AppError("Error with stack", 500);
        expect(typeof error.stack).toBe("string");
    });
});
