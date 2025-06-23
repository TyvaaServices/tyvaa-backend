import fp from'fastify-plugin';
import fastifyJWT from '@fastify/jwt';

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

    fastify.decorate('isAdmin', async function (request, reply) {
        if (!request.user || request.user.role !== 'admin') {
            return reply.code(403).send({ error: 'Forbidden', message: 'Admin only' });
        }
    });

    done();
}

export default fp(jwtPlugin);
