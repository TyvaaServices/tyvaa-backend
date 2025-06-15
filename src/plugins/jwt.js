const fp = require("fastify-plugin");
const fastifyJwt = require("@fastify/jwt");

module.exports = fp(async function (fastify, opts) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "supersecret",
  });

  fastify.decorate("signToken", function (payload) {
    return this.jwt.sign(payload);
  });
});
