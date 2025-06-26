import fp from "fastify-plugin";

/**
 * Fastify plugin for centralized error handling of custom and generic errors.
 * Handles AppError and its subclasses, as well as generic errors, returning appropriate status codes and messages.
 *
 * @param {import("fastify").FastifyInstance} fastify
 */
async function errorHandlerPlugin(fastify) {
    const { AppError } = await import("../utils/customErrors.js");
    fastify.setErrorHandler((error, request, reply) => {
        if (error && error.statusCode && error instanceof AppError) {
            reply.status(error.statusCode).send({
                error: error.name,
                message: error.message,
                ...(error.details ? { details: error.details } : {}),
            });
        } else if (error && error.statusCode) {
            reply.status(error.statusCode).send({
                error: error.name || "Error",
                message: error.message,
            });
        } else {
            reply.status(500).send({
                error: "InternalServerError",
                message: "An unexpected error occurred.",
            });
        }
    });
}

export default fp(errorHandlerPlugin);
