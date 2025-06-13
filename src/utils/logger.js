const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

function createLogger(serviceName = 'default-service') {
    return pino({
        base: {
            service: serviceName,
        },
        ...(isProd ? {} : {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                    serviceName: serviceName,
                }
            }
        })
    });
}

module.exports = createLogger;
