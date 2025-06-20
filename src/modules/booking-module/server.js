import fastify from 'fastify';
import router from './routes/bookingRouter.js';
import dotenv from 'dotenv';

dotenv.config();

const app = fastify({logger: true});
app.register(router, {prefix: '/api/v1'});

export default async function (fastify, opts) {
    fastify.register(router, {prefix: '/api/v1'});
};
