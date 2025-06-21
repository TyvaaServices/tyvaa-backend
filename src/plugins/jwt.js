import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";

export default fp(async function (fastify, opts) {
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || "supersecret",
    });

    fastify.decorate("signToken", function (payload) {
        return this.jwt.sign(payload);
    });
});
