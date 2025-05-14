'use strict';
require('dotenv').config();

const fastify = require('fastify')({logger: true});
const chatbotRoutes = require('./src/routes/chatbotRoutes');


//TODO a faire dans tout les service rend lacces avec authentification obligatoire
// const authMiddleware = require('./src/middleware/authMiddleware');
// fastify.register(authMiddleware);
// fastify.addHook('onRequest', authMiddleware); fastify.register(chatbotRoutes, {prefix: '/api/v1/support'});

const port = process.env.PORT || 2001;
fastify.listen({port, host: '0.0.0.0'}, (err, address) => {
    if (err) {
        fastify.log.error(err);

        process.exit(1);
    }
    fastify.log.info(`Chatbot API listening at ${address}/api/support/chat`);
});
