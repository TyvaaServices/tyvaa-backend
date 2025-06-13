const fastify = require('fastify');
const cron = require('node-cron');
const generateRecurringRides = require('./cron/generateRecurringRides');
const app = fastify({logger: true});
const router = require('./routes/rideRouter');
require('dotenv').config();

app.register(router, {prefix: '/api/v1'});

module.exports = async function (fastify, opts) {
    fastify.register(router, { prefix: '/api/v1' });

    cron.schedule('* * * * *', async () => {
        fastify.log.info('Running recurring ride generation cron job...');
        try {
            await generateRecurringRides();
            fastify.log.info('Recurring ride generation completed.');
        } catch (err) {
            fastify.log.error('Error in recurring ride generation cron job', err);
        }
    });
};
