const fastify = require('fastify');
const sequelize = require('./config/db');
const cron = require('node-cron');
const generateRecurringRides = require('./cron/generateRecurringRides');
const app = fastify({logger: true});
const {RideModel, RideInstance, Booking, RideRating} = require('./models/index');
const router = require('./routes/rideRouter');
const authMiddleware = require('./middleware/authMiddleware');

const port = process.env.PORT || 2004;

// app.addHook('preHandler', authMiddleware);
app.register(router, {prefix: '/api/v1'});

async function start() {
    try {
        await sequelize.sync({alter: true, logging: false});
        app.log.info('Database synced');
        const address = await app.listen({port: port, host: '0.0.0.0'});
        app.log.info(`Server listening at ${address}`);
        cron.schedule('* * * * *', async () => {
            app.log.info('Running recurring ride generation cron job...');
            try {
                await generateRecurringRides();
                app.log.info('Recurring ride generation completed.');
            } catch (err) {
                app.log.error('Error in recurring ride generation cron job', err);
            }
        });
    } catch (err) {
        app.log.error('Error syncing database:', err);
        if (err.stack) app.log.error(err.stack);
        process.exit(1);
    }
}

start();
