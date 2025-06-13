const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
    base: {
        service: 'user-service',
    },
    ...(isProd ? {} : {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss',
                ignore: 'pid,hostname'
            }
        }
    })
});

module.exports = logger;
