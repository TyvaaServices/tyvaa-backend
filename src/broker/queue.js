import { EventEmitter } from "events";

class Queue extends EventEmitter {
    /**
     * @param {string} name - The queue name.
     * @param {RedisStorage} storage - The storage backend for persisting messages.
     */
    constructor(name, storage) {
        super();
        this.name = name;
        this.storage = storage;
        this.subscribers = [];
        this.processing = false;
        this.processingInterval = null;
        this.retryTimeouts = new Map(); // Track retry timeouts
        this.config = {
            maxRetries: 3,
            retryDelay: process.env.NODE_ENV === "test" ? 10 : 1000,
            retryBackoffMultiplier: 2,
            processingInterval: 100,
            maxConcurrentProcessing: 1,
            deadLetterQueueEnabled: true,
        };
        // Start queue processing
        this.startProcessing();
    }

    /**
     * Publishes a message to the queue with optional delay and priority.
     * @param {Object} msg - The message to publish.
     * @param {Object} options - Publishing options
     * @param {number} options.delay - Delay in milliseconds before message becomes available
     * @param {number} options.priority - Message priority (higher number = higher priority)
     * @param {number} options.maxRetries - Override default max retries for this message
     * @returns {string} messageId
     */
    async publish(msg, options = {}) {
        const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();

        const messageWithMetadata = {
            ...msg,
            messageId,
            acknowledged: false,
            createdAt: now,
            availableAt: now + (options.delay || 0),
            priority: options.priority || 0,
            retries: 0,
            maxRetries: options.maxRetries ?? this.config.maxRetries,
            status: "pending", // pending, processing, completed, failed, dead
            lastAttempt: null,
            error: null,
        };

        await this.storage.save(this.name, messageWithMetadata);
        // No in-memory push; always rely on Redis for multi-process
        this.emit("message-published", {
            messageId,
            queueName: this.name,
            message: messageWithMetadata,
        });
        return messageId;
    }

    /**
     * Start processing messages in the queue
     */
    startProcessing() {
        if (this.processingInterval) return;
        this.processingInterval = setInterval(() => {
            this.processNextMessage();
        }, this.config.processingInterval);
        this.emit("processing-started", { queueName: this.name });
    }

    /**
     * Stop processing messages
     */
    stopProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.retryTimeouts.clear();
        this.emit("processing-stopped", { queueName: this.name });
    }

    /**
     * Process the next available message in FIFO order
     */
    async processNextMessage() {
        if (this.processing) return;
        this.processing = true;
        try {
            // Pop the next message from Redis
            const message = await this.storage.pop(this.name);
            if (!message) {
                this.processing = false;
                return;
            }

            message.status = "processing";
            message.lastAttempt = Date.now();

            this.emit("message-processing", {
                messageId: message.messageId,
                queueName: this.name,
            });

            try {
                // Notify all subscribers
                await this.notifySubscribers(message);

                // If message is acknowledged by a subscriber, mark as completed
                if (message.acknowledged) {
                    message.status = "completed";
                    this.emit("message-completed", {
                        messageId: message.messageId,
                        queueName: this.name,
                    });
                } else {
                    // If not acknowledged, it will be retried
                    await this.scheduleRetry(message);
                }
            } catch (error) {
                await this.handleMessageError(message, error);
            }
        } finally {
            this.processing = false;
        }
    }

    /**
     * Schedule a retry for a failed message
     */
    async scheduleRetry(message) {
        message.retries++;

        if (message.retries >= message.maxRetries) {
            await this.moveToDeadLetterQueue(message);
            return;
        }

        const retryDelay =
            this.config.retryDelay *
            Math.pow(this.config.retryBackoffMultiplier, message.retries - 1);
        message.availableAt = Date.now() + retryDelay;
        message.status = "pending";

        // Push the message back to Redis for retry
        await this.storage.save(this.name, message);

        this.emit("message-retry-scheduled", {
            messageId: message.messageId,
            queueName: this.name,
            retryCount: message.retries,
            nextAttemptAt: message.availableAt,
        });
    }

    /**
     * Move message to dead letter queue (in-memory for now, or could be a Redis list)
     */
    async moveToDeadLetterQueue(message) {
        message.status = "dead";
        // Optionally, push to a Redis dead letter list
        await this.storage.save(`${this.name}:dead`, message);
        this.emit("message-dead-letter", {
            messageId: message.messageId,
            queueName: this.name,
        });
    }

    /**
     * Handle message processing error
     */
    async handleMessageError(message, error) {
        message.error = error
            ? error.stack || error.message || error
            : "Unknown error";

        await this.scheduleRetry(message);

        this.emit("message-error", {
            messageId: message.messageId,
            queueName: this.name,
            error: message.error,
        });
    }

    /**
     * Notifies all subscribers of a message.
     * @param {Object} msg - The message to send to subscribers.
     */
    async notifySubscribers(msg) {
        const promises = this.subscribers.map(async (callback) => {
            try {
                await callback(msg);
            } catch (error) {
                this.emit("subscriber-error", {
                    messageId: msg.messageId,
                    queueName: this.name,
                    error: error.message,
                });
                throw error;
            }
        });

        await Promise.all(promises);
    }

    /**
     * Subscribes a callback to receive new messages.
     * @param {function(Object):Promise<void>|void} callback - Function called with each new message.
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        this.emit("subscriber-added", {
            queueName: this.name,
            subscriberCount: this.subscribers.length,
        });
    }

    /**
     * Unsubscribe a callback
     * @param {function} callback - The callback to remove
     */
    unsubscribe(callback) {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
            this.subscribers.splice(index, 1);
            this.emit("subscriber-removed", {
                queueName: this.name,
                subscriberCount: this.subscribers.length,
            });
        }
    }

    /**
     * Acknowledge a message by messageId.
     * @param {string} messageId
     */
    async acknowledge(messageId) {
        // Optionally, store acknowledged IDs in Redis for audit
        this.emit("message-acknowledged", {
            messageId,
            queueName: this.name,
        });
    }
}

export default Queue;
