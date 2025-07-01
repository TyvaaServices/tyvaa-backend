/**
 * @file Defines custom error classes for consistent error handling throughout the application.
 */

/**
 * Base class for application-specific errors.
 * @extends Error
 */
class AppError extends Error {
    /**
     * Creates an instance of AppError.
     * @param {string} message - The error message.
     * @param {number} statusCode - The HTTP status code associated with this error.
     * @param {string} [errorCode] - An optional application-specific error code.
     * @param {object} [details] - Optional additional details about the error.
     */
    constructor(message, statusCode, errorCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name; // Ensures the name property holds the class name
        this.errorCode = errorCode; // Application-specific error code (e.g., 'VALIDATION_ERROR', 'AUTH_FAILURE')
        this.details = details; // Any additional structured information about the error

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Represents a 400 Bad Request error.
 * Typically used when client-provided data fails validation or is malformed.
 * @extends AppError
 */
class BadRequestError extends AppError {
    /**
     * Creates an instance of BadRequestError.
     * @param {object} [details] - Optional additional details.
     * @param {string} [message="Bad Request"] - The error message.
     */
    constructor(details, message = "Bad Request") {
        super(message, 400, "BAD_REQUEST", details);
    }
}

/**
 * Represents a 401 Unauthorized error.
 * Used when authentication is required and has failed or has not yet been provided.
 * @extends AppError
 */
class AuthenticationError extends AppError {
    /**
     * Creates an instance of AuthenticationError.
     * @param {object} [details] - Optional additional details.
     * @param {string} [message="Unauthorized"] - The error message.
     */
    constructor(details, message = "Unauthorized") {
        super(message, 401, "AUTHENTICATION_FAILURE", details);
    }
}

/**
 * Represents a 403 Forbidden error.
 * Used when the server understands the request but refuses to authorize it.
 * The user is authenticated but lacks necessary permissions for the resource.
 * @extends AppError
 */
class ForbiddenError extends AppError {
    /**
     * Creates an instance of ForbiddenError.
     * @param {object} [details] - Optional additional details.
     * @param {string} [message="Forbidden"] - The error message.
     */
    constructor(details, message = "Forbidden") {
        super(message, 403, "FORBIDDEN_ACCESS", details);
    }
}

/**
 * Represents a 404 Not Found error.
 * Used when the server cannot find the requested resource.
 * @extends AppError
 */
class NotFoundError extends AppError {
    /**
     * Creates an instance of NotFoundError.
     * @param {object} [details] - Optional additional details.
     * @param {string} [message="Not Found"] - The error message.
     */
    constructor(details, message = "Not Found") {
        super(message, 404, "RESOURCE_NOT_FOUND", details);
    }
}

/**
 * Represents a 409 Conflict error.
 * Used when a request conflict with current state of the server.
 * For example, creating a resource that already exists.
 * @extends AppError
 */
class ConflictError extends AppError {
    /**
     * Creates an instance of ConflictError.
     * @param {object} [details] - Optional additional details.
     * @param {string} [message="Conflict"] - The error message.
     */
    constructor(details, message = "Conflict") {
        super(message, 409, "RESOURCE_CONFLICT", details);
    }
}

/**
 * Represents a 500 Internal Server Error.
 * A generic error message, given when an unexpected condition was encountered
 * and no more specific message is suitable.
 * @extends AppError
 */
class InternalServerError extends AppError {
    /**
     * Creates an instance of InternalServerError.
     * @param {object} [details] - Optional additional details.
     * @param {string} [message="Internal Server Error"] - The error message.
     */
    constructor(details, message = "Internal Server Error") {
        super(message, 500, "INTERNAL_SERVER_ERROR", details);
    }
}

export {
    AppError,
    BadRequestError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    InternalServerError,
};
