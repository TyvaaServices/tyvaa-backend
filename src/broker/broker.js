import Queue from "./queue.js";
import RedisStorage from "./redisStorage.js";
import { EventEmitter } from "events";
import createLogger from "#utils/logger.js";
import dotenv from "dotenv";
dotenv.config();
const logger = createLogger("broker");

console.log("[BROKER] process.cwd():", process.cwd());

class Broker extends EventEmitter {
    /**
     * Initializes the broker with an empty set of queues and a shared storage backend.
     * @param {Object} config - Broker configuration
     */
    constructor(config = {}) {
        super();
        this.queues = {};
        this.storage = new RedisStorage();
        this.config = {
            autoStart: true,
            globalRetryPolicy: {
                maxRetries: 3,
                retryDelay: 1000,
                retryBackoffMultiplier: 2,
            },
            ...config,
        };

        this.setupGlobalEventHandlers();
    }

    /**
     * Setup global event handlers for all queues
     */
    setupGlobalEventHandlers() {
        // Forward queue events to broker level
        this.on("queue-created", ({ queueName, queue }) => {
            // Forward all queue events with broker context
            queue.on("message-published", (data) =>
                this.emit("message-published", data)
            );
            queue.on("message-processing", (data) =>
                this.emit("message-processing", data)
            );
            queue.on("message-completed", (data) =>
                this.emit("message-completed", data)
            );
            queue.on("message-acknowledged", (data) =>
                this.emit("message-acknowledged", data)
            );
            queue.on("message-error", (data) =>
                this.emit("message-error", data)
            );
            queue.on("message-retry-scheduled", (data) =>
                this.emit("message-retry-scheduled", data)
            );
            queue.on("message-dead-letter", (data) =>
                this.emit("message-dead-letter", data)
            );
            queue.on("subscriber-error", (data) =>
                this.emit("subscriber-error", data)
            );
            queue.on("processing-started", (data) =>
                this.emit("queue-processing-started", data)
            );
            queue.on("processing-stopped", (data) =>
                this.emit("queue-processing-stopped", data)
            );
        });
    }

    /**
     * Gets or creates a queue by name.
     * @param {string} name - The queue name.
     * @param {Object} queueConfig - Queue-specific configuration
     * @param {boolean} createIfMissing - Whether to create the queue if it doesn't exist
     * @returns {Queue} The queue instance.
     */
    getQueue(name, queueConfig = {}, createIfMissing = true) {
        if (!this.queues[name]) {
            if (!createIfMissing) return undefined;
            const queue = new Queue(name, this.storage);

            if (this.config.globalRetryPolicy) {
                Object.assign(queue.config, this.config.globalRetryPolicy);
            }

            if (queueConfig) {
                Object.assign(queue.config, queueConfig);
            }

            this.queues[name] = queue;
            this.emit("queue-created", { queueName: name, queue });
        }
        return this.queues[name];
    }

    /**
     * Publishes a message to a named queue with enhanced options.
     * @param {string} queueName - The queue name.
     * @param {Object} msg - The message to publish.
     * @param {Object} options - Publishing options
     * @param {number} options.delay - Delay in milliseconds before message becomes available
     * @param {number} options.priority - Message priority (higher number = higher priority)
     * @param {number} options.maxRetries - Override default max retries for this message
     * @returns {string} messageId
     */
    publish(queueName, msg, options = {}) {
        return this.getQueue(queueName).publish(msg, options);
    }

    /**
     * Publishes a delayed message
     * @param {string} queueName - The queue name
     * @param {Object} msg - The message to publish
     * @param {number} delayMs - Delay in milliseconds
     * @returns {string} messageId
     */
    publishDelayed(queueName, msg, delayMs) {
        return this.publish(queueName, msg, { delay: delayMs });
    }

    /**
     * Publishes a priority message
     * @param {string} queueName - The queue name
     * @param {Object} msg - The message to publish
     * @param {number} priority - Message priority
     * @returns {string} messageId
     */
    publishPriority(queueName, msg, priority) {
        return this.publish(queueName, msg, { priority });
    }

    /**
     * Subscribes a callback to a named queue.
     * @param {string} queueName - The queue name.
     * @param {function(Object):Promise<void>|void} callback - Function called with each new message.
     */
    subscribe(queueName, callback) {
        this.getQueue(queueName).subscribe(callback);
    }

    /**
     * Unsubscribe from a queue
     * @param {string} queueName - The queue name
     * @param {function} callback - The callback to remove
     */
    unsubscribe(queueName, callback) {
        if (this.queues[queueName]) {
            this.queues[queueName].unsubscribe(callback);
        }
    }

    /**
     * Acknowledge a message
     * @param {string} queueName - The queue name
     * @param {string} messageId - The message ID to acknowledge
     */
    acknowledge(queueName, messageId) {
        if (this.queues[queueName]) {
            this.queues[queueName].acknowledge(messageId);
        }
    }

    /**
     * Get statistics for all queues or a specific queue
     * @param {string} queueName - Optional queue name
     * @returns {Object} Statistics
     */
    getStats(queueName = null) {
        if (queueName) {
            const queue = this.getQueue(queueName, {}, false);
            return queue ? queue.getStats() : null;
        }

        const stats = {
            totalQueues: Object.keys(this.queues).length,
            queues: {},
        };

        for (const [name, queue] of Object.entries(this.queues)) {
            stats.queues[name] = queue.getStats();
        }

        return stats;
    }

    /**
     * Purge completed messages from all queues or a specific queue
     * @param {string} queueName - Optional queue name
     * @returns {Object} Purge results
     */
    purgeCompleted(queueName = null) {
        if (queueName) {
            return {
                [queueName]: this.queues[queueName]?.purgeCompleted() || 0,
            };
        }

        const results = {};
        for (const [name, queue] of Object.entries(this.queues)) {
            results[name] = queue.purgeCompleted();
        }

        return results;
    }

    /**
     * Start processing for all queues or a specific queue
     * @param {string} queueName - Optional queue name
     */
    startProcessing(queueName = null) {
        if (queueName) {
            this.queues[queueName]?.startProcessing();
        } else {
            Object.values(this.queues).forEach((queue) =>
                queue.startProcessing()
            );
        }
    }

    /**
     * Stop processing for all queues or a specific queue
     * @param {string} queueName - Optional queue name
     */
    stopProcessing(queueName = null) {
        if (queueName) {
            this.queues[queueName]?.stopProcessing();
        } else {
            Object.values(this.queues).forEach((queue) =>
                queue.stopProcessing()
            );
        }
    }

    /**
     * Create a fanout exchange - publish to multiple queues
     * @param {string[]} queueNames - Array of queue names
     * @param {Object} msg - The message to publish
     * @param {Object} options - Publishing options
     * @returns {string[]} Array of message IDs
     */
    fanout(queueNames, msg, options = {}) {
        return queueNames.map((queueName) =>
            this.publish(queueName, msg, options)
        );
    }

    /**
     * Create a topic exchange - publish based on routing key pattern
     * @param {string} routingKey - The routing key (e.g., 'user.created')
     * @param {Object} msg - The message to publish
     * @param {Object} options - Publishing options
     * @returns {string[]} Array of message IDs
     */
    publishTopic(routingKey, msg, options = {}) {
        // Simple pattern matching - can be enhanced
        const matchingQueues = Object.keys(this.queues).filter((queueName) => {
            return (
                queueName.includes(routingKey) || routingKey.includes(queueName)
            );
        });

        return this.fanout(matchingQueues, msg, options);
    }

    /**
     * Get dead letter messages from all queues
     * @returns {Object} Dead letter messages grouped by queue
     */
    getDeadLetterMessages() {
        const deadLetters = {};

        for (const [name, queue] of Object.entries(this.queues)) {
            if (queue.deadLetterQueue.length > 0) {
                deadLetters[name] = queue.deadLetterQueue;
            }
        }

        return deadLetters;
    }

    /**
     * Requeue dead letter messages
     * @param {string} queueName - The queue name
     * @param {string} messageId - Optional specific message ID
     * @returns {number} Number of messages requeued
     */
    requeueDeadLetters(queueName, messageId = null) {
        const queue = this.queues[queueName];
        if (!queue) return 0;

        let requeuedCount = 0;

        if (messageId) {
            const deadLetterIndex = queue.deadLetterQueue.findIndex(
                (msg) => msg.messageId === messageId
            );
            if (deadLetterIndex > -1) {
                const message = queue.deadLetterQueue.splice(
                    deadLetterIndex,
                    1
                )[0];
                message.status = "pending";
                message.retries = 0;
                message.error = null;
                message.availableAt = Date.now();
                queue.messages.push(message);
                queue.sortMessages();
                requeuedCount = 1;
            }
        } else {
            // Requeue all dead letters for this queue
            queue.deadLetterQueue.forEach((message) => {
                message.status = "pending";
                message.retries = 0;
                message.error = null;
                message.availableAt = Date.now();
                queue.messages.push(message);
            });
            requeuedCount = queue.deadLetterQueue.length;
            queue.deadLetterQueue = [];
            queue.sortMessages();
        }

        if (requeuedCount > 0) {
            queue.persistMessages();
            this.emit("dead-letters-requeued", { queueName, requeuedCount });
        }

        return requeuedCount;
    }

    /**
     * Destroy the broker and clean up all resources
     */
    destroy() {
        Object.values(this.queues).forEach((queue) => queue.destroy());
        this.queues = {};
        this.removeAllListeners();
    }
}

export default new Broker();
