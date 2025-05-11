const fastify = require('fastify')({logger: true});
require('dotenv').config();
const jwt = require('fastify-jwt');

fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret'
});

fastify.get('/health', async (req, reply) => {
    return {status: 'auth-service running'};
});

fastify.post('/token', async (req, reply) => {
    const {id, username} = req.body;
    const token = fastify.jwt.sign({id, username});
    return {token};
});

fastify.post('/verify', async (req, reply) => {
    try {
        const decoded = await fastify.jwt.verify(req.body.token);
        return {valid: true, decoded};
    } catch (err) {
        reply.code(401).send({valid: false, error: err.message});
    }
});

const port = process.env.PORT || 2002;
fastify.listen({port, host: '0.0.0.0'}).then(r => {
    console.log("auth is up");
});