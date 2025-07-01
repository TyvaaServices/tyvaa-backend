import { EventEmitter } from "events";
import createLogger from "#utils/logger.js";
import dotenv from "dotenv";
import { getChannel, closeConnection, getConnection } from "./rabbitmqConnector.js";

dotenv.config();
const logger = createLogger("broker");

class Broker extends EventEmitter {
    constructor(brokerConfig = {}) {
        super();
        this.config = { ...brokerConfig }; // Store any specific config if needed
        this.channel = null;
        this.connection = null;
        this.consumers = new Map(); // To keep track of consumers for unsubscribing
        logger.info("Broker initialized (RabbitMQ integration)");
    }

    async connect() {
        try {
            logger.info("Broker connect method called. Establishing RabbitMQ channel...");
            this.channel = await getChannel();
            this.connection = await getConnection(); // Get connection for health checks or advanced ops

            this.connection.on('error', (err) => {
                logger.error('Broker: RabbitMQ connection error:', err.message);
                this.emit('error', err);
                this.channel = null; // Mark channel as unusable
                // Reconnect logic is handled by rabbitmqConnector
            });
            this.connection.on('close', () => {
                logger.warn('Broker: RabbitMQ connection closed.');
                this.emit('close');
                this.channel = null;
            });

            logger.info("RabbitMQ channel established for broker.");
            this.emit("connected");
        } catch (error) {
            logger.error("Failed to connect broker to RabbitMQ:", error);
            this.emit("error", error);
            throw error; // Re-throw to allow caller to handle critical connection failure
        }
    }

    async assertQueue(queueName, options = { durable: true }) {
        if (!this.channel) {
            logger.warn("No channel available for assertQueue. Attempting to connect.");
            await this.connect();
        }
        try {
            await this.channel.assertQueue(queueName, options);
            logger.info(`Queue asserted: ${queueName}, Options: ${JSON.stringify(options)}`);
        } catch (error) {
            logger.error(`Failed to assert queue ${queueName}:`, error);
            this.emit("error", error);
            throw error;
        }
    }

    async publish(exchangeName, routingKey, msg, options = { persistent: true }) {
        if (!this.channel) {
            // await this.connect(); // Or throw error if not connected
            const err = new Error("Broker not connected. Cannot publish message.");
            logger.error(err.message, { exchangeName, routingKey, msg });
            this.emit("error", err);
            throw err;
        }
        try {
            const content = Buffer.from(JSON.stringify(msg));
            // Default exchange is an empty string for direct to queue
            const ex = exchangeName === null || typeof exchangeName === 'undefined' ? "" : exchangeName;
            const rk = exchangeName === null || typeof exchangeName === 'undefined' ? routingKey : routingKey; // routingKey is queue name if default exchange

            if (ex === "" && !rk) {
                 const err = new Error("Routing key (queue name) must be provided when using default exchange.");
                 logger.error(err.message);
                 this.emit("error", err);
                 throw err;
            }

            await this.channel.publish(ex, rk, content, options);
            logger.info(`Message published to exchange '${ex}' with routingKey '${rk}'.`);
            this.emit("message-published", { exchangeName: ex, routingKey: rk, msg });
            return true;
        } catch (error) {
            logger.error("Failed to publish message:", error);
            this.emit("error", error);
            // Consider if message should be requeued or handled by publisher
            throw error;
        }
    }

    /**
     * Simplified publish directly to a queue. Assumes default exchange.
     * Ensures queue exists before publishing.
     */
    async sendToQueue(queueName, msg, queueOptions = { durable: true }, messageOptions = { persistent: true }) {
        if (!this.channel) {
             const err = new Error("Broker not connected. Cannot send to queue.");
            logger.error(err.message, { queueName, msg });
            this.emit("error", err);
            throw err;
        }
        try {
            await this.assertQueue(queueName, queueOptions); // Ensure queue exists
            const content = Buffer.from(JSON.stringify(msg));
            this.channel.sendToQueue(queueName, content, messageOptions); // Returns boolean, but promise wrapper in publish is fine
            logger.info(`Message sent to queue '${queueName}'.`);
            this.emit("message-published", { queueName, msg }); // Event might need adjustment
            return true;
        } catch (error) {
            logger.error(`Failed to send message to queue ${queueName}:`, error);
            this.emit("error", error);
            throw error;
        }
    }


    async subscribe(queueName, callback, options = { noAck: false }, queueOptions = { durable: true }) {
        if (!this.channel) {
            // await this.connect(); // Or throw error
             const err = new Error("Broker not connected. Cannot subscribe.");
            logger.error(err.message, { queueName });
            this.emit("error", err);
            throw err;
        }
        try {
            await this.assertQueue(queueName, queueOptions); // Ensure queue exists

            const { consumerTag } = await this.channel.consume(queueName, async (msg) => {
                if (msg !== null) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        logger.info(`Received message from ${queueName} (consumer: ${consumerTag})`, { messageId: msg.properties.messageId });
                        // Pass the full message object so callback can ack/nack
                        await callback(content, msg);
                    } catch (parseError) {
                        logger.error(`Error parsing message from ${queueName}:`, parseError);
                        // Decide how to handle unparseable messages - nack without requeue?
                        if (!options.noAck) {
                           try {
                               this.channel.nack(msg, false, false); // Don't requeue unparseable message
                               logger.warn(`Nacked unparseable message from ${queueName}.`);
                           } catch (nackError) {
                               logger.error(`Failed to NACK unparseable message: ${nackError}`, nackError)
                           }
                        }
                    }
                }
            }, options);

            this.consumers.set(consumerTag, queueName); // Store consumerTag
            logger.info(`Subscribed to queue '${queueName}' with consumerTag '${consumerTag}'.`);
            this.emit("subscribed", { queueName, consumerTag });
            return consumerTag;
        } catch (error) {
            logger.error(`Failed to subscribe to queue ${queueName}:`, error);
            this.emit("error", error);
            throw error;
        }
    }

    acknowledge(message) {
        if (!this.channel) {
            logger.error("No channel available to acknowledge message.");
            return;
        }
        try {
            this.channel.ack(message);
            logger.info("Message acknowledged.", { messageId: message.properties.messageId });
            this.emit("message-acknowledged", { messageId: message.properties.messageId });
        } catch (error) {
            logger.error("Failed to acknowledge message:", error);
            this.emit("error", error);
        }
    }

    nack(message, allUpTo = false, requeue = false) {
        if (!this.channel) {
            logger.error("No channel available to nack message.");
            return;
        }
        try {
            this.channel.nack(message, allUpTo, requeue);
            logger.info(`Message nacked (requeue: ${requeue}).`, { messageId: message.properties.messageId });
            this.emit("message-nacked", { messageId: message.properties.messageId, requeue });
        } catch (error) {
            logger.error("Failed to nack message:", error);
            this.emit("error", error);
        }
    }

    async unsubscribe(consumerTag) {
        if (!this.channel) {
            logger.warn("No channel available to unsubscribe.");
            return false;
        }
        if (!this.consumers.has(consumerTag)) {
            logger.warn(`Consumer tag ${consumerTag} not found for unsubscribe.`);
            return false;
        }
        try {
            await this.channel.cancel(consumerTag);
            const queueName = this.consumers.get(consumerTag);
            this.consumers.delete(consumerTag);
            logger.info(`Unsubscribed consumer '${consumerTag}' from queue '${queueName}'.`);
            this.emit("unsubscribed", { consumerTag, queueName });
            return true;
        } catch (error) {
            logger.error(`Failed to unsubscribe consumer ${consumerTag}:`, error);
            this.emit("error", error);
            return false;
        }
    }

    async purgeQueue(queueName) {
        if (!this.channel) {
             const err = new Error("Broker not connected. Cannot purge queue.");
            logger.error(err.message, { queueName });
            this.emit("error", err);
            throw err;
        }
        try {
            const result = await this.channel.purgeQueue(queueName);
            logger.info(`Queue '${queueName}' purged. ${result.messageCount} messages deleted.`);
            this.emit("queue-purged", { queueName, messageCount: result.messageCount });
            return result;
        } catch (error) {
            logger.error(`Failed to purge queue ${queueName}:`, error);
            this.emit("error", error);
            throw error;
        }
    }

    async destroy() {
        logger.info("Destroying broker and closing RabbitMQ connection...");
        // Unsubscribe all active consumers
        for (const consumerTag of this.consumers.keys()) {
            try {
                await this.unsubscribe(consumerTag);
            } catch (err) {
                logger.error(`Error unsubscribing consumer ${consumerTag} during destroy:`, err);
            }
        }
        this.consumers.clear();

        await closeConnection(); // Uses the shared closeConnection from rabbitmqConnector
        this.channel = null;
        this.connection = null;
        this.removeAllListeners();
        logger.info("Broker destroyed.");
    }

    // For health checks or direct channel access if absolutely needed
    getChannelInstance() {
        return this.channel;
    }

    getConnectionInstance() {
        return this.connection;
    }
}

// Singleton instance management
let brokerInstance = null;

export default {
    getInstance: (config) => {
        if (!brokerInstance) {
            brokerInstance = new Broker(config);
        }
        return brokerInstance;
    },
    BrokerClass: Broker // Expose class for testing or specific instantiation
};
