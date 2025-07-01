import fp from "fastify-plugin";
import fastifyJWT from "@fastify/jwt";
import { AuthenticationError } from "./customErrors.js";

function jwtPlugin(fastify, opts, done) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        fastify.log.warn(
            "JWT_SECRET environment variable is not set. Using a default, insecure secret. THIS IS NOT SUITABLE FOR PRODUCTION."
        );
    }
    fastify.register(fastifyJWT, {
        secret: jwtSecret || "supersecret",
    });

    fastify.decorate("authenticate", async function (request, _reply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            request.log.warn(
                { error: err.message, ip: request.ip },
                "JWT authentication failed."
            );
            throw new AuthenticationError(
                undefined,
                `Authentication failed: ${err.message}`
            );
        }
    });

    fastify.decorate("signToken", function (payload, options = {}) {
        return this.jwt.sign(payload, options);
    });

    done();
}

export default fp(jwtPlugin);
