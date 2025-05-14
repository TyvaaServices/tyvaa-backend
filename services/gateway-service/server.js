'use strict';
require('dotenv').config();

const fastify = require('fastify')({logger: true, trustProxy: true});
const proxy = require('@fastify/http-proxy');
const swaggerConfig = require('./config/swagger');
const rateLimit = require('@fastify/rate-limit');

const compress = require('@fastify/compress');

fastify.register(compress, {global: true});

fastify.register(require('@fastify/swagger'), swaggerConfig.options);
fastify.register(require('@fastify/swagger-ui'), swaggerConfig.uiOptions);

fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req, res) => {
        return req.headers['x-forwarded-for'] || req.ip;
    },
})
fastify.register(proxy, {
    upstream: process.env.CHATBOT_SERVICE_URL || 'http://localhost:2001',
    prefix: '/support/chat',
    rewritePrefix: '/api/v1/support/chat',
});

fastify.register(proxy, {
    upstream: process.env.USER_SERVICE_URL || 'http://localhost:2003',
    prefix: '/users',
    rewritePrefix: '/api/v1/users',
});
fastify.register(proxy, {
    upstream: process.env.RIDE_SERVICE_URL || 'http://localhost:2006',
    prefix: '/rides',
    rewritePrefix: '/api/v1/rides'
});

const port = process.env.PORT || 2000;
fastify.listen({port, host: '0.0.0.0'}, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    fastify.log.info(`Gateway API listening at ${address}`);
    fastify.log.info(`Gateway API Documentation at ${address}/docs`);
});
