'use strict';
require('dotenv').config();

const fastify = require('fastify')({logger: true});
const proxy = require('@fastify/http-proxy');
const swaggerConfig = require('./config/swagger');

fastify.register(require('@fastify/swagger'), swaggerConfig.options);
fastify.register(require('@fastify/swagger-ui'), swaggerConfig.uiOptions);

fastify.register(proxy, {
    upstream: process.env.CHATBOT_SERVICE_URL || 'http://localhost:2001/api/v1',
    prefix: '/support/chat',
    rewritePrefix: '/support/chat',
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
