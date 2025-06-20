import {pino}from 'pino';
import fs from 'fs';
import path from 'path';

// Use import.meta.url to get the directory in ES modules
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const isProd = process.env.NODE_ENV === 'production';

function createLogger(serviceName = 'default-service') {
    const logDir = path.resolve(__dirname, '../../', 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const logFile = path.join(logDir, `${serviceName}.log`);
    const fileStream = pino.destination({ dest: logFile, sync: false });

    if (isProd) {
        return pino(
            {
                base: { service: serviceName },
            },
            fileStream
        );
    }

    // For non-prod: pretty print to console + write to file
    const prettyTransport = pino.transport({
        targets: [
            {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                },
                level: 'info',
            },
            {
                target: 'pino/file',
                options: { destination: logFile, mkdir: true },
                level: 'info',
            },
        ],
    });
    return pino({ base: { service: serviceName } }, prettyTransport);
}

export default createLogger;
