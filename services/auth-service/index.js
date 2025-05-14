const fastify = require('fastify')({logger: true});
require('dotenv').config();
const jwt = require('fastify-jwt');

fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret'
});

fastify.get('/api/v1/health', async (req, reply) => {
    return {status: 'auth-service running'};
});

fastify.post('/api/v1/token', async (req, reply) => {
    const {id, phoneNumber} = req.body;
    const token = fastify.jwt.sign({id, phoneNumber});
    return {token};
});

fastify.post('/api/v1/verify', async (req, reply) => {
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