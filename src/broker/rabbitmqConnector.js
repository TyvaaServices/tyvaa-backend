import amqp from "amqplib";
import createLogger from "#utils/logger.js";
import dotenv from "dotenv";

dotenv.config();
const logger = createLogger("rabbitmq-connector");

let connection = null;
let channel = null;
let isConnecting = false;
const MAX_RETRIES = 10; // Maximum number of connection retries
const RETRY_DELAY_MS = 5000; // Delay in milliseconds between retries

/**
 * Establishes a connection to RabbitMQ and creates a channel, with retry logic.
 * This function is intended for internal use by `getChannel` and `getConnection`.
 * It manages the module-level `connection` and `channel` variables.
 * @async
 * @param {number} [attempt=1] - The current connection attempt number.
 * @returns {Promise<{connection: import("amqplib").Connection, channel: import("amqplib").Channel}>} Resolves with the connection and channel.
 * @throws {Error} If connection fails after all retries or if RABBITMQ_URL is not set.
 */
async function connectWithRetry(attempt = 1) {
    const rabbitmqUrl = process.env.RABBITMQ_URL; // Get URL directly from environment
    if (!rabbitmqUrl) {
        // Do not proceed, do not call amqp.connect
        return Promise.reject(
            new Error(
                "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
            )
        );
    }
    if (isConnecting) {
        logger.info(
            "Connection attempt already in progress, awaiting existing attempt."
        );
        return new Promise((resolve, reject) => {
            const checkConnection = () => {
                if (!isConnecting) {
                    if (connection && channel) {
                        resolve({ connection, channel });
                    } else {
                        reject(
                            new Error("Connection attempt finished but failed.")
                        );
                    }
                } else {
                    setTimeout(checkConnection, 1000);
                }
            };
            checkConnection();
        });
    }
    isConnecting = true;
    logger.info(
        `Attempting to connect to RabbitMQ (Attempt ${attempt}/${MAX_RETRIES})...`
    );
    try {
        connection = await amqp.connect(rabbitmqUrl);
        logger.info("Successfully connected to RabbitMQ.");

        connection.on("error", (err) => {
            logger.error("RabbitMQ connection error:", err);
            connection = null;
            channel = null;
            // Optional: implement reconnection logic here or rely on process restart
        });

        connection.on("close", () => {
            logger.warn("RabbitMQ connection closed.");
            connection = null;
            channel = null;
            // Optional: implement reconnection logic here
        });

        channel = await connection.createChannel();
        logger.info("RabbitMQ channel created.");

        channel.on("error", (err) => {
            logger.error("RabbitMQ channel error:", err);
            channel = null;
            // Optional: attempt to recreate channel or connection
        });

        channel.on("close", () => {
            logger.warn("RabbitMQ channel closed.");
            channel = null;
        });

        isConnecting = false;
        return { connection, channel };
    } catch (error) {
        isConnecting = false;
        logger.error(
            `Error connecting to RabbitMQ (Attempt ${attempt}):`,
            error.message
        );
        if (attempt < MAX_RETRIES) {
            logger.info(
                `Retrying connection in ${RETRY_DELAY_MS / 1000} seconds...`
            );
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            return connectWithRetry(attempt + 1);
        } else {
            logger.error(
                "Max RabbitMQ connection retries reached. Could not connect."
            );
            throw error;
        }
    }
}

/**
 * Retrieves the current RabbitMQ channel. If a channel doesn't exist or connection is down,
 * it attempts to establish a new connection and channel using `connectWithRetry`.
 * @async
 * @export
 * @returns {Promise<import("amqplib").Channel>} The RabbitMQ channel.
 * @throws {Error} If unable to establish a channel after connection attempts.
 */
export async function getChannel() {
    if (!process.env.RABBITMQ_URL) {
        throw new Error(
            "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
        );
    }
    if (!channel || !connection || connection.connection === null) {
        // Added check for connection.connection being potentially null from amqplib types
        logger.warn(
            "No active RabbitMQ channel or connection found. Attempting to connect..."
        );
        await connectWithRetry(); // This will set module-level 'channel' and 'connection' or throw
    }
    // After connectWithRetry, channel should be set if successful.
    if (!channel) {
        // This state should ideally be prevented by connectWithRetry throwing an error if it fails.
        // However, as a safeguard:
        throw new Error(
            "Failed to establish RabbitMQ channel after connection attempt."
        );
    }
    return channel;
}

/**
 * Retrieves the current RabbitMQ connection. If a connection doesn't exist,
 * it attempts to establish a new one using `connectWithRetry`.
 * @async
 * @export
 * @returns {Promise<import("amqplib").Connection>} The RabbitMQ connection.
 * @throws {Error} If unable to establish a connection after attempts.
 */
export async function getConnection() {
    if (!process.env.RABBITMQ_URL) {
        throw new Error(
            "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
        );
    }
    if (!connection || connection.connection === null) {
        // Added check for connection.connection
        logger.warn(
            "No active RabbitMQ connection found. Attempting to connect..."
        );
        await connectWithRetry(); // This will set module-level 'connection' or throw
    }
    // After connectWithRetry, connection should be set if successful.
    if (!connection) {
        // Safeguard, similar to getChannel
        throw new Error(
            "Failed to establish RabbitMQ connection after attempt."
        );
    }
    return connection;
}

/**
 * Closes the RabbitMQ channel and connection if they exist.
 * Resets the module-level `channel` and `connection` variables to null.
 * Sets `isConnecting` to false to allow new connection attempts.
 * @async
 * @export
 */
export async function closeConnection() {
    isConnecting = false; // Allow new connection attempts after close
    if (channel) {
        try {
            await channel.close();
            logger.info("RabbitMQ channel closed.");
        } catch (err) {
            logger.error("Error closing RabbitMQ channel:", err);
        }
        channel = null;
    }
    if (connection) {
        try {
            await connection.close();
            logger.info("RabbitMQ connection closed.");
        } catch (err) {
            logger.error("Error closing RabbitMQ connection:", err);
        }
        connection = null;
    }
}

// Graceful shutdown
process.on("SIGINT", async () => {
    logger.info("SIGINT received, closing RabbitMQ connection...");
    await closeConnection();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, closing RabbitMQ connection...");
    await closeConnection();
    process.exit(0);
});
