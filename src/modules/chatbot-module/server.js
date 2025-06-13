'use strict';
require('dotenv').config();

const chatbotRoutes = require('./src/routes/chatbotRoutes');


module.exports = async function (fastify, opts) {
    fastify.register(chatbotRoutes, { prefix: '/api/v1/support' });
};
