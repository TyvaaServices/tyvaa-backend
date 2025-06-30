import fs from "fs";
import { EventEmitter } from "events";

class Queue extends EventEmitter {
    /**
     * @param {string} name - The queue name.
     * @param {FileStorage} storage - The storage backend for persisting messages.
     */
    constructor(name, storage) {
        super();
        this.name = name;
        this.storage = storage;
        this.subscribers = [];
        this.messages = this.storage.load(name);
        this.processing = false;
        this.processingInterval = null;
        this.retryTimeouts = new Map(); // Track retry timeouts
        this.deadLetterQueue = [];

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
    publish(msg, options = {}) {
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

        this.storage.save(this.name, messageWithMetadata);
        this.messages.push(messageWithMetadata);

        // Sort messages by priority (desc) then by availableAt (asc) for FIFO within priority
        this.sortMessages();

        this.emit("message-published", {
            messageId,
            queueName: this.name,
            message: messageWithMetadata,
        });

        return messageId;
    }

    /**
     * Sort messages for FIFO processing with priority support
     */
    sortMessages() {
        this.messages.sort((a, b) => {
            // First by priority (higher priority first)
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // Then by availableAt (FIFO within same priority)
            return a.availableAt - b.availableAt;
        });
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

        // Clear any pending retry timeouts
        this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.retryTimeouts.clear();

        this.emit("processing-stopped", { queueName: this.name });
    }

    /**
     * Process the next available message in FIFO order
     */
    async processNextMessage() {
        if (this.processing) return;

        const now = Date.now();

        // Find the next message that's ready to be processed
        const messageIndex = this.messages.findIndex(
            (msg) =>
                msg.status === "pending" &&
                msg.availableAt <= now &&
                !msg.acknowledged
        );

        if (messageIndex === -1) return;

        const message = this.messages[messageIndex];

        this.processing = true;
        message.status = "processing";
        message.lastAttempt = now;

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
                this.scheduleRetry(message);
            }
        } catch (error) {
            this.handleMessageError(message, error);
        }

        this.processing = false;
        this.persistMessages();
    }

    /**
     * Schedule a retry for a failed message
     */
    scheduleRetry(message) {
        message.retries++;

        if (message.retries >= message.maxRetries) {
            this.moveToDeadLetterQueue(message);
            return;
        }

        const retryDelay =
            this.config.retryDelay *
            Math.pow(this.config.retryBackoffMultiplier, message.retries - 1);
        message.availableAt = Date.now() + retryDelay;
        message.status = "pending";

        this.emit("message-retry-scheduled", {
            messageId: message.messageId,
            queueName: this.name,
            retryCount: message.retries,
            nextAttemptAt: message.availableAt,
        });
    }

    /**
     * Handle message processing error
     */
    handleMessageError(message, error) {
        message.error = error.message;

        this.emit("message-error", {
            messageId: message.messageId,
            queueName: this.name,
            error: error.message,
            retryCount: message.retries,
        });

        this.scheduleRetry(message);
    }

    /**
     * Move message to dead letter queue
     */
    moveToDeadLetterQueue(message) {
        message.status = "dead";

        if (this.config.deadLetterQueueEnabled) {
            this.deadLetterQueue.push({
                ...message,
                deadLetterAt: Date.now(),
                originalQueue: this.name,
            });
        }

        this.emit("message-dead-letter", {
            messageId: message.messageId,
            queueName: this.name,
        });
    }

    /**
     * Acknowledge a message by messageId.
     * @param {string} messageId
     */
    acknowledge(messageId) {
        const msg = this.messages.find((m) => m.messageId === messageId);
        if (msg && !msg.acknowledged) {
            msg.acknowledged = true;
            msg.status = "completed";
            this.emit("message-acknowledged", {
                messageId,
                queueName: this.name,
            });
            this.persistMessages();
        }
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
     * Persist all messages to disk
     */
    persistMessages() {
        const file = this.storage.dir + "/" + this.name + ".jsonl";

        try {
            fs.writeFileSync(
                file,
                this.messages.map((m) => JSON.stringify(m)).join("\n") + "\n"
            );
        } catch (error) {
            this.emit("persistence-error", {
                queueName: this.name,
                error: error.message,
            });
        }
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const stats = {
            queueName: this.name,
            totalMessages: this.messages.length,
            pendingMessages: this.messages.filter((m) => m.status === "pending")
                .length,
            processingMessages: this.messages.filter(
                (m) => m.status === "processing"
            ).length,
            completedMessages: this.messages.filter(
                (m) => m.status === "completed"
            ).length,
            failedMessages: this.messages.filter((m) => m.status === "failed")
                .length,
            deadLetterMessages: this.deadLetterQueue.length,
            subscriberCount: this.subscribers.length,
            isProcessing: this.processing,
        };

        return stats;
    }

    /**
     * Purge completed and acknowledged messages
     */
    purgeCompleted() {
        const initialCount = this.messages.length;
        this.messages = this.messages.filter(
            (m) => m.status !== "completed" || !m.acknowledged
        );
        const purgedCount = initialCount - this.messages.length;

        this.persistMessages();
        this.emit("messages-purged", { queueName: this.name, purgedCount });

        return purgedCount;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopProcessing();
        this.removeAllListeners();
        this.subscribers = [];
    }
}

export default Queue;
