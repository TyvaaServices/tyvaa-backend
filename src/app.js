import Fastify from 'fastify';
import chatbotModule from './modules/chatbot-module/server.js';
import notificationModule from './modules/notification-module/server.js';
import rideModule from './modules/ride-module/server.js';
import userModule from './modules/user-module/server.js';
import bookingModule from './modules/booking-module/server.js';
import paymentModule from './modules/payment-module/server.js';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import swaggerConfig from './config/swagger.js';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import fastifyJwtPlugin from './utils/jwt.js';

dotenv.config();

export async function buildApp() {
    const fastify = Fastify({logger: true});
    // Register /health route early so it's always available
    fastify.get('/health', async (request, reply) => {
        return { status: 'ok' };
    });
    fastify.register(cors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Content-Length', 'X-Requested-With'],
        credentials: true,
        maxAge: 86400
    });
    fastify.register(fastifyJwtPlugin);
    fastify.register(chatbotModule);
    fastify.register(notificationModule);
    fastify.register(rideModule);
    fastify.register(userModule);
    fastify.register(bookingModule);
    fastify.register(paymentModule);
    fastify.register(await import('@fastify/swagger'), swaggerConfig.options);
    fastify.register(await import('@fastify/swagger-ui'), swaggerConfig.uiOptions);
    fastify.register(compress, {global: true});
    fastify.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        keyGenerator: (req, res) => req.headers['x-forwarded-for'] || req.ip,
    });
    return fastify;
}

export async function startServer() {
    const fastify = await buildApp();
    const sequelize = (await import('./config/db.js')).default;
    return new Promise((resolve, reject) => {
        fastify.listen({port: process.env.PORT || 3000, host: '0.0.0.0'}, async (err, address) => {
            if (err) {
                fastify.log.error(err);
                reject(err);
            }
            if (process.env.NODE_ENV !== 'test') {
                try {
                    await sequelize.sync({ alter: true, logging: false });
                    fastify.log.info('Database synchronized');
                } catch (syncError) {
                    fastify.log.error('Database sync failed:', syncError);
                    return reject(syncError instanceof Error ? syncError : new Error(syncError));
                }
            }
            fastify.log.info(`Server listening at ${address}`);
            resolve(fastify);
        });
        const shutdown = async () => {
            try {
                await fastify.close();
                setTimeout(() => process.exit(0), 200);
            } catch (err) {
                fastify.log.error('Error during shutdown', err);
                process.exit(1);
            }
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    });
}

if (process.env.NODE_ENV !== 'test') {
    startServer().catch((err) => {
        console.error('Failed to start app:', err);
        process.exit(1);
    });
}
