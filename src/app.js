const fastify = require('fastify')({logger: true});
const chatbotModule = require('./modules/chatbot-module/server');
const notificationModule = require('./modules/notification-module/server');
const rideModule = require('./modules/ride-module/server');
const userModule = require('./modules/user-module/server');
const bookingModule = require('./modules/booking-module/server');
const rideRatingModule = require('./modules/rideRating-module/server');
const paymentModule = require('./modules/payment-module/server');
const auditModule = require('./modules/audit-module/server');
require('dotenv').config();


fastify.register(require('@fastify/cors'),{
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
});
const sequelize = require('./config/db');
const {User, RideModel, Booking, RideInstance, RideRating,DriverApplication,Payment,AuditAction,AuditLog,passengerProfile,driverProfile} = require('./config');
const swaggerConfig = require("./config/swagger");
const rateLimit = require('@fastify/rate-limit');

const compress = require('@fastify/compress');
const fastifyJwt = require('@fastify/jwt');

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
            return;
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
    fastify.register(rideRatingModule);
    fastify.register(auditModule);
    fastify.register(require('@fastify/swagger'), swaggerConfig.options);
    fastify.register(require('@fastify/swagger-ui'), swaggerConfig.uiOptions);
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
            await sequelize.sync({alter: true, logging: false});
            fastify.log.info(`Server listening at ${address}`);
        });
        ;

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
