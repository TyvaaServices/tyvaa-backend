const fp = require('fastify-plugin');
const fastifyJWT = require('@fastify/jwt');

function jwtPlugin(fastify, opts, done) {
    fastify.register(fastifyJWT, {
        secret: process.env.JWT_SECRET || 'supersecret',
    });

    fastify.decorate('authenticate', async function (request, reply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.code(401).send({error: 'Unauthorized', message: err.message});
        }
    });

    fastify.decorate('signToken', function (payload, options = {}) {
        return this.jwt.sign(payload, options);
    });

    done();
}

module.exports = fp(jwtPlugin);
