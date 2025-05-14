const fastify = require('fastify');
const sequelize = require('./config/db');
const app = fastify({logger: true});
const router = require('./routes/rideRouter');

const port = process.env.PORT || 2004;

app.register(router);

app.listen({port: port, host: '0.0.0.0'}, async (err, address) => {
    if (err) {

        app.log.error(err);
        process.exit(1);
    }

    try {
        await sequelize.sync({force: true, logging: true});
        app.log.info('Database synced');
    } catch (err) {
        app.log.error('Error syncing database', err);
    }

    app.log.info(`Server listening at ${address}`);
});
