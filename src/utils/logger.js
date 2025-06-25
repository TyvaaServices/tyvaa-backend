import { pino } from "pino";
import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const isProd = process.env.NODE_ENV === "production";

/**
 * Creates a Pino logger instance for a specific service.
 *
 * In production: Logs JSON to a service-specific file.
 * In development: Pretty-prints to console and logs JSON to a service-specific file.
 *
 * @param {string} [serviceName="application"] - Name of the service or module, used for log file naming and context.
 * @param {object} [defaultPinoOptions={}] - Default options to pass to pino constructor.
 * @returns {pino.Logger} Configured Pino logger instance.
 */
function createLogger(serviceName = "application", defaultPinoOptions = {}) {
    const logDir = path.resolve(__dirname, "../../", "logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const logFile = path.join(
        logDir,
        `${sanitizeLogFileName(serviceName)}.log`
    );
    const fileStream = pino.destination({
        dest: logFile,
        sync: false,
        mkdir: true,
    });

    // Determine log level
    const logLevel =
        process.env.LOG_LEVEL ||
        defaultPinoOptions.level ||
        (isProd ? "info" : "debug");

    if (isProd) {
        return pino(
            {
                base: { service: serviceName, pid: process.pid },
                level: logLevel,
                ...defaultPinoOptions,
            },
            fileStream
        );
    }

    const prettyTransport = pino.transport({
        targets: [
            {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "yyyy-mm-dd HH:MM:ss",
                    ignore: "pid,hostname",
                },
                level: "debug",
            },
            {
                target: "pino/file",
                options: {
                    destination: logFile,
                    mkdir: true,
                },
                level: "trace",
            },
        ],
    });

    return pino(
        {
            base: { service: serviceName, pid: process.pid },
            level: logLevel,
            ...defaultPinoOptions,
        },
        prettyTransport
    );
}

/**
 * Sanitizes a service name to be used as part of a log file name.
 * Replaces non-alphanumeric characters (except hyphens and underscores) with an underscore.
 * @param {string} serviceName - The original service name.
 * @returns {string} The sanitized service name.
 */
function sanitizeLogFileName(serviceName) {
    return serviceName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

export default createLogger;
