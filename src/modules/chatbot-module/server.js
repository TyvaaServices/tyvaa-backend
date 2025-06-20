'use strict';
import dotenv from 'dotenv';
import chatbotRoutes from './routes/chatbotRoutes.js';

dotenv.config();

export default async function (fastify, opts) {
    fastify.register(chatbotRoutes, { prefix: '/api/v1/support' });
};
