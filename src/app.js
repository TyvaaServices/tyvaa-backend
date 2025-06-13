const fastify = require('fastify')({ logger: true });
const chatbotModule = require('./modules/chatbot-module/server');
const notificationModule = require('./modules/notification-module/server');
const rideModule = require('./modules/ride-module/server');
const userModule = require('./modules/user-module/server');
const bookingModule = require('./modules/booking-module/server');
const rideRatingModule = require('./modules/rideRating-module/server');
require('dotenv').config();
const sequelize = require('./config/db');
const {User, RideModel, Booking, RideInstance,RideRating} = require('./config/index');
const swaggerConfig = require("./config/swagger");
const rateLimit = require('@fastify/rate-limit');

const compress = require('@fastify/compress');

async function buildApp() {
    fastify.register(chatbotModule);
    fastify.register(notificationModule);
    fastify.register(rideModule);
    fastify.register(userModule);
    fastify.register(bookingModule);
    fastify.register(rideRatingModule);
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
}

buildApp()
    .then(() => {
        fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }, async (err, address) => {
            if (err) {
                fastify.log.error(err);
                process.exit(1);
            }
            await sequelize.sync({alter: true, logging: false});
            fastify.log.info(`Server listening at ${address}`);
        });
    })
    .catch((err) => {
        fastify.log.error('Failed to start app:', err);
        process.exit(1);
    });