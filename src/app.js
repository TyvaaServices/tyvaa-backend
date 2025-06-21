import Fastify from 'fastify';
import chatbotModule from './modules/chatbot-module/server.js';
import notificationModule from './modules/notification-module/server.js';
import rideModule from './modules/ride-module/server.js';
import userModule from './modules/user-module/server.js';
import bookingModule from './modules/booking-module/server.js';
import paymentModule from './modules/payment-module/server.js';
import auditModule from './modules/audit-module/server.js';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import sequelize from './config/db.js';
import swaggerConfig from './config/swagger.js';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import fastifyJwt from '@fastify/jwt';

dotenv.config();

const fastify = Fastify({logger: true});

fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
});

async function buildApp() {
    fastify.register(fastifyJwt, {secret: process.env.JWT_SECRET || 'your-secret-key'});


    fastify.decorate('signToken', function (payload) {
        return this.jwt.sign(payload);
    });

    fastify.decorate('authenticate', async function (request, reply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.code(401).send({message: 'Invalid or missing token'});
        }
    });
    fastify.decorate('isAdmin', async function (request, reply) {
        if (request.user && request.user.role === 'admin') {

        } else {
            reply.code(403).send({message: 'Forbidden: Admins only'});
        }
    });
    fastify.register(chatbotModule);
    fastify.register(notificationModule);
    fastify.register(rideModule);
    fastify.register(userModule);
    fastify.register(bookingModule);
    fastify.register(paymentModule);
    fastify.register(auditModule);
    fastify.register(await import('@fastify/swagger'), swaggerConfig.options);
    fastify.register(await import('@fastify/swagger-ui'), swaggerConfig.uiOptions);
    fastify.register(compress, {global: true});
    fastify.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        keyGenerator: (req, res) => {
            return req.headers['x-forwarded-for'] || req.ip;
        },
    });
    fastify.addHook('onRequest', async (request, reply) => {
        if (request.method !== 'OPTIONS') {
            request.log.info({url: request.url, method: request.method}, 'Incoming request');
        }
    });
    fastify.addHook('onResponse', (request, reply) => {
        request.log.info({url: request.url, method: request.method, statusCode: reply.statusCode}, 'Response sent');
    });

}

buildApp()
    .then(() => {
        let server;
        fastify.listen({port: process.env.PORT || 3000, host: '0.0.0.0'}, async (err, address) => {
            if (err) {
                fastify.log.error(err);
                process.exit(1);
            }
            await sequelize.sync({force: true, logging: false});
            fastify.log.info(`Server listening at ${address}`);
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
    })
    .catch((err) => {
        fastify.log.error('Failed to start app:', err);
        process.exit(1);
    });
