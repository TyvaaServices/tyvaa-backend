const fastify = require('fastify');
const app = fastify({logger: true});
const router = require('./routes/userRouter');
const sequelize = require('./config/db');
const User = require('./models/user');
const logger = require('./utils/logger');
app.register(require('@fastify/multipart'));
app.register(router, {prefix: '/api/v1'});

const port = process.env.PORT || 2003;
app.listen({port: port, host: '0.0.0.0'}, async (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    await sequelize.sync({
        alter: true, logging: true
    }).then(() => {
        app.log.info('Database synced');
    }).catch(err => {
        app.log.error('Error syncing database', err);
        console.log(err);
    });
    app.log.info(`Server listening at ${address}`);
});


