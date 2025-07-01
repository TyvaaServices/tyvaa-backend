import amqp from "amqplib";
import createLogger from "#utils/logger.js";
import dotenv from "dotenv";

dotenv.config();
const logger = createLogger("rabbitmq-connector");

let connection = null;
let channel = null;
let isConnecting = false;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5000;

async function connectWithRetry(attempt = 1) {
    if (isConnecting) {
        logger.info("Connection attempt already in progress.");
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
        const rabbitmqUrl = process.env.RABBITMQ_URL; // Get URL directly from environment
        if (!rabbitmqUrl) {
            isConnecting = false;
            throw new Error(
                "RabbitMQ URL is not configured. Please set RABBITMQ_URL environment variable."
            );
        }

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

export async function getChannel() {
    if (!channel || !connection || connection.connection === null) {
        logger.warn(
            "No active RabbitMQ channel or connection found. Attempting to connect..."
        );
        await connectWithRetry();
    }
    if (!channel) {
        throw new Error(
            "Failed to establish RabbitMQ channel after connection attempt."
        );
    }
    return channel;
}

export async function getConnection() {
    if (!connection || connection.connection === null) {
        logger.warn(
            "No active RabbitMQ connection found. Attempting to connect..."
        );
        await connectWithRetry();
    }
    if (!connection) {
        throw new Error(
            "Failed to establish RabbitMQ connection after attempt."
        );
    }
    return connection;
}

export async function closeConnection() {
    isConnecting = false;
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
