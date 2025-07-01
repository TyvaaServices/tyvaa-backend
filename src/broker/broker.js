import { EventEmitter } from "events";
import createLogger from "#utils/logger.js";
import dotenv from "dotenv";
import {
    closeConnection,
    getChannel,
    getConnection,
} from "./rabbitmqConnector.js";

dotenv.config();
const logger = createLogger("broker");

/**
 * @class Broker
 * @extends EventEmitter
 * @description Manages RabbitMQ connections, channels, publishing, and subscribing to messages.
 * Emits events: 'connected', 'error', 'close', 'message-published', 'subscribed', 'unsubscribed',
 * 'message-acknowledged', 'message-nacked', 'queue-purged'.
 */
class Broker extends EventEmitter {
    /**
     * Creates an instance of the Broker.
     * @param {object} [brokerConfig={}] - Optional configuration for the broker.
     */
    constructor(brokerConfig = {}) {
        super();
        this.config = { ...brokerConfig };
        /** @type {import("amqplib").Channel | null} */
        this.channel = null;
        /** @type {import("amqplib").Connection | null} */
        this.connection = null;
        /** @type {Map<string, string>} */
        this.consumers = new Map(); // Map of consumerTag to queueName
        logger.info("Broker initialized (RabbitMQ integration)");
    }

    /**
     * Connects to RabbitMQ, establishes a channel, and sets up connection event listeners.
     * Emits 'connected' on success, or 'error' on failure.
     * @async
     * @throws {Error} If connection or channel creation fails.
     */
    async connect() {
        try {
            logger.info(
                "Broker connect method called. Establishing RabbitMQ channel..."
            );
            this.channel = await getChannel();
            this.connection = await getConnection();
            this.connection.on("error", (err) => {
                logger.error("Broker: RabbitMQ connection error:", err.message);
                this.emit("error", err);
                this.channel = null;
            });
            this.connection.on("close", () => {
                logger.warn("Broker: RabbitMQ connection closed.");
                this.emit("close");
                this.channel = null;
            });

            logger.info("RabbitMQ channel established for broker.");
            this.emit("connected");
        } catch (error) {
            logger.error("Failed to connect broker to RabbitMQ:", error);
            this.emit("error", error);
            throw error;
        }
    }

    /**
     * Asserts a queue, creating it if it doesn't exist.
     * Will attempt to connect if not already connected.
     * @async
     * @param {string} queueName - The name of the queue.
     * @param {import("amqplib").Options.AssertQueue} [options={ durable: true }] - Options for queue assertion.
     * @throws {Error} If asserting queue fails or connection cannot be established.
     */
    async assertQueue(queueName, options = { durable: true }) {
        if (!this.channel) {
            logger.warn(
                "No channel available for assertQueue. Attempting to connect."
            );
            await this.connect();
        }
        try {
            await this.channel.assertQueue(queueName, options);
            logger.info(
                `Queue asserted: ${queueName}, Options: ${JSON.stringify(options)}`
            );
        } catch (error) {
            logger.error(`Failed to assert queue ${queueName}:`, error);
            this.emit("error", error);
            throw error;
        }
    }

    /**
     * Publishes a message to a specific exchange with a routing key.
     * Will attempt to connect if not already connected.
     * @async
     * @param {string | null} exchangeName - The name of the exchange. Use null or "" for the default exchange.
     * @param {string} routingKey - The routing key.
     * @param {object} msg - The message object to publish (will be JSON-stringified).
     * @param {import("amqplib").Options.Publish} [options={ persistent: true }] - Options for publishing.
     * @returns {Promise<boolean>} True if successful.
     * @throws {Error} If publishing fails, connection issues, or invalid parameters (e.g. no routingKey for default exchange).
     */
    async publish(
        exchangeName,
        routingKey,
        msg,
        options = { persistent: true }
    ) {
        if (!this.channel) {
            // Attempt to connect if channel is not available.
            // This might throw if connection fails, which is desired.
            await this.connect();
            // If connect() succeeded, this.channel should be set. If it's still null, something is wrong.
            // However, connect() itself throws if it fails to get a channel.
            // A more direct check after connect() might be redundant if connect() is robust.
            // For safety, one might re-check this.channel here, but if connect() fulfills its contract,
            // this path implies an issue within connect() not setting the channel or throwing.
            // The original code had a throw here, which implies connect() might not always set channel on success.
            // Let's assume connect() is reliable: if it resolves, channel is set.
            // If connect() failed, it would have thrown, and we wouldn't reach here.
            // Thus, the original error throw here might be for a state not covered by a failing connect().
            // For now, retaining original behavior of throwing if channel isn't set after trying to connect.
            if (!this.channel) {
                // Re-check after attempting connect
                const err = new Error(
                    "Broker not connected after attempting to connect. Cannot publish message."
                );
                logger.error(err.message, { exchangeName, routingKey, msg });
                this.emit("error", err);
                throw err;
            }
        }
        try {
            const content = Buffer.from(JSON.stringify(msg));
            const ex =
                exchangeName === null || typeof exchangeName === "undefined"
                    ? ""
                    : exchangeName;
            const rk =
                exchangeName === null || typeof exchangeName === "undefined"
                    ? routingKey
                    : routingKey;

            if (ex === "" && !rk) {
                const err = new Error(
                    "Routing key (queue name) must be provided when using default exchange."
                );
                logger.error(err.message);
                this.emit("error", err);
                throw err;
            }

            await this.channel.publish(ex, rk, content, options);
            logger.info(
                `Message published to exchange '${ex}' with routingKey '${rk}'.`
            );
            this.emit("message-published", {
                exchangeName: ex,
                routingKey: rk,
                msg,
            });
            return true;
        } catch (error) {
            logger.error("Failed to publish message:", error);
            this.emit("error", error);
            // Consider if message should be requeued or handled by publisher
            throw error;
        }
    }

    /**
     * Sends a message directly to a specified queue (uses default exchange).
     * Asserts the queue before sending. Will attempt to connect if not already connected.
     * @async
     * @param {string} queueName - The name of the target queue.
     * @param {object} msg - The message object (will be JSON-stringified).
     * @param {import("amqplib").Options.AssertQueue} [queueOptions={ durable: true }] - Options for asserting the queue.
     * @param {import("amqplib").Options.Publish} [messageOptions={ persistent: true }] - Options for sending the message.
     * @returns {Promise<boolean>} True if successful.
     * @throws {Error} If sending fails or connection issues.
     */
    async sendToQueue(
        queueName,
        msg,
        queueOptions = { durable: true },
        messageOptions = { persistent: true }
    ) {
        if (!this.channel) {
            // Attempt to connect if channel is not available.
            await this.connect();
            if (!this.channel) {
                // Re-check after attempting connect
                const err = new Error(
                    "Broker not connected after attempting to connect. Cannot send to queue."
                );
                logger.error(err.message, { queueName, msg });
                this.emit("error", err);
                throw err;
            }
        }
        try {
            await this.assertQueue(queueName, queueOptions); // Ensure queue exists
            const content = Buffer.from(JSON.stringify(msg));
            this.channel.sendToQueue(queueName, content, messageOptions);
            logger.info(`Message sent to queue '${queueName}'.`);
            this.emit("message-published", { queueName, msg });
            return true;
        } catch (error) {
            logger.error(
                `Failed to send message to queue ${queueName}:`,
                error
            );
            this.emit("error", error);
            throw error;
        }
    }

    /**
     * Subscribes to a queue and executes a callback for each message received.
     * Asserts the queue before subscribing. Will attempt to connect if not already connected.
     * @async
     * @param {string} queueName - The name of the queue to subscribe to.
     * @param {(payload: object, originalMessage: import("amqplib").ConsumeMessage) => Promise<void>} callback - Async function to process the message.
     *        It receives the parsed JSON payload and the original AMQP message.
     * @param {import("amqplib").Options.Consume} [options={ noAck: false }] - Options for consuming messages.
     * @param {import("amqplib").Options.AssertQueue} [queueOptions={ durable: true }] - Options for asserting the queue.
     * @returns {Promise<string>} The consumer tag associated with the subscription.
     * @throws {Error} If subscription fails or connection issues.
     */
    async subscribe(
        queueName,
        callback,
        options = { noAck: false },
        queueOptions = { durable: true }
    ) {
        if (!this.channel) {
            await this.connect();
            if (!this.channel) {
                const err = new Error(
                    "Broker not connected after attempting to connect. Cannot subscribe."
                );
                logger.error(err.message, { queueName });
                this.emit("error", err);
                throw err;
            }
        }
        try {
            await this.assertQueue(queueName, queueOptions); // Ensure queue exists

            const { consumerTag } = await this.channel.consume(
                queueName,
                async (msg) => {
                    if (msg !== null) {
                        try {
                            const content = JSON.parse(msg.content.toString());
                            logger.info(
                                `Received message from ${queueName} (consumer: ${consumerTag})`,
                                { messageId: msg.properties.messageId }
                            );
                            await callback(content, msg);
                        } catch (parseError) {
                            logger.error(
                                `Error parsing message from ${queueName}:`,
                                parseError
                            );
                            if (!options.noAck) {
                                try {
                                    this.channel.nack(msg, false, false);
                                    logger.warn(
                                        `Nacked unparseable message from ${queueName}.`
                                    );
                                } catch (nackError) {
                                    logger.error(
                                        `Failed to NACK unparseable message: ${nackError}`,
                                        nackError
                                    );
                                }
                            }
                        }
                    }
                },
                options
            );

            this.consumers.set(consumerTag, queueName);
            logger.info(
                `Subscribed to queue '${queueName}' with consumerTag '${consumerTag}'.`
            );
            this.emit("subscribed", { queueName, consumerTag });
            return consumerTag;
        } catch (error) {
            logger.error(`Failed to subscribe to queue ${queueName}:`, error);
            this.emit("error", error);
            throw error;
        }
    }

    /**
     * Acknowledges a message.
     * @param {import("amqplib").ConsumeMessage} message - The message to acknowledge.
     */
    acknowledge(message) {
        if (!this.channel) {
            logger.error("No channel available to acknowledge message.");
            return;
        }
        try {
            this.channel.ack(message);
            logger.info("Message acknowledged.", {
                messageId: message.properties.messageId,
            });
            this.emit("message-acknowledged", {
                messageId: message.properties.messageId,
            });
        } catch (error) {
            logger.error("Failed to acknowledge message:", error);
            this.emit("error", error);
        }
    }

    /**
     * Negatively acknowledges a message.
     * @param {import("amqplib").ConsumeMessage} message - The message to nack.
     * @param {boolean} [allUpTo=false] - If true, nack all messages up to this one.
     * @param {boolean} [requeue=false] - If true, requeue the message.
     */
    nack(message, allUpTo = false, requeue = false) {
        if (!this.channel) {
            logger.error("No channel available to nack message.");
            return;
        }
        try {
            this.channel.nack(message, allUpTo, requeue);
            logger.info(`Message nacked (requeue: ${requeue}).`, {
                messageId: message.properties.messageId,
            });
            this.emit("message-nacked", {
                messageId: message.properties.messageId,
                requeue,
            });
        } catch (error) {
            logger.error("Failed to nack message:", error);
            this.emit("error", error);
        }
    }

    /**
     * Unsubscribes a consumer by its tag.
     * @async
     * @param {string} consumerTag - The consumer tag to unsubscribe.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async unsubscribe(consumerTag) {
        if (!this.channel) {
            logger.warn("No channel available to unsubscribe.");
            return false;
        }
        if (!this.consumers.has(consumerTag)) {
            logger.warn(
                `Consumer tag ${consumerTag} not found for unsubscribe.`
            );
            return false;
        }
        try {
            await this.channel.cancel(consumerTag);
            const queueName = this.consumers.get(consumerTag);
            this.consumers.delete(consumerTag);
            logger.info(
                `Unsubscribed consumer '${consumerTag}' from queue '${queueName}'.`
            );
            this.emit("unsubscribed", { consumerTag, queueName });
            return true;
        } catch (error) {
            logger.error(
                `Failed to unsubscribe consumer ${consumerTag}:`,
                error
            );
            this.emit("error", error);
            return false;
        }
    }

    /**
     * Purges all messages from a queue.
     * Will attempt to connect if not already connected.
     * @async
     * @param {string} queueName - The name of the queue to purge.
     * @returns {Promise<import("amqplib").Replies.PurgeQueue>} The reply from the server.
     * @throws {Error} If purging fails or connection issues.
     */
    async purgeQueue(queueName) {
        if (!this.channel) {
            await this.connect();
            if (!this.channel) {
                const err = new Error(
                    "Broker not connected after attempting to connect. Cannot purge queue."
                );
                logger.error(err.message, { queueName });
                this.emit("error", err);
                throw err;
            }
        }
        try {
            const result = await this.channel.purgeQueue(queueName);
            logger.info(
                `Queue '${queueName}' purged. ${result.messageCount} messages deleted.`
            );
            this.emit("queue-purged", {
                queueName,
                messageCount: result.messageCount,
            });
            return result;
        } catch (error) {
            logger.error(`Failed to purge queue ${queueName}:`, error);
            this.emit("error", error);
            throw error;
        }
    }

    /**
     * Closes all consumers, the channel, and the connection.
     * Removes all event listeners.
     * @async
     */
    async destroy() {
        logger.info("Destroying broker and closing RabbitMQ connection...");
        for (const consumerTag of this.consumers.keys()) {
            try {
                await this.unsubscribe(consumerTag);
            } catch (err) {
                logger.error(
                    `Error unsubscribing consumer ${consumerTag} during destroy:`,
                    err
                );
            }
        }
        this.consumers.clear();

        await closeConnection(); // Uses the imported closeConnection from rabbitmqConnector
        this.channel = null;
        this.connection = null; // Ensure connection is also nulled out
        this.removeAllListeners();
        logger.info("Broker destroyed.");
    }

    /**
     * Gets the current RabbitMQ channel instance.
     * @returns {import("amqplib").Channel | null} The channel, or null if not connected.
     */
    getChannelInstance() {
        return this.channel;
    }

    /**
     * Gets the current RabbitMQ connection instance.
     * @returns {import("amqplib").Connection | null} The connection, or null if not connected.
     */
    getConnectionInstance() {
        return this.connection;
    }
}

// Singleton instance management
let brokerInstance = null;

/**
 * @typedef {Object} BrokerManager
 * @property {(config?: object) => Broker} getInstance - Gets the singleton instance of the Broker.
 * @property {typeof Broker} BrokerClass - The Broker class itself.
 */

/**
 * @type {BrokerManager}
 */
export default {
    /**
     * Gets the singleton instance of the Broker.
     * @param {object} [config] - Optional configuration for the broker, passed if creating a new instance.
     * @returns {Broker} The singleton Broker instance.
     */
    getInstance: (config) => {
        if (!brokerInstance) {
            brokerInstance = new Broker(config);
        }
        return brokerInstance;
    },
    BrokerClass: Broker,
};

export { Broker };
