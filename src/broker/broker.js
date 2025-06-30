// Broker manages multiple named queues and provides publish/subscribe APIs.
// It ensures each queue is backed by persistent storage and supports real-time message delivery.
import Queue from "./queue.js";
import FileStorage from "./storage.js";

class Broker {
    /**
     * Initializes the broker with an empty set of queues and a shared storage backend.
     */
    constructor() {
        this.queues = {};
        this.storage = new FileStorage();
    }

    /**
     * Gets or creates a queue by name.
     * @param {string} name - The queue name.
     * @returns {Queue} The queue instance.
     */
    getQueue(name) {
        if (!this.queues[name]) {
            this.queues[name] = new Queue(name, this.storage);
        }
        return this.queues[name];
    }

    /**
     * Publishes a message to a named queue.
     * @param {string} queueName - The queue name.
     * @param {Object} msg - The message to publish.
     * @returns {string} messageId
     */
    publish(queueName, msg) {
        return this.getQueue(queueName).publish(msg);
    }

    /**
     * Subscribes a callback to a named queue.
     * @param {string} queueName - The queue name.
     * @param {function(Object):void} callback - Function called with each new message.
     */
    subscribe(queueName, callback) {
        this.getQueue(queueName).subscribe(callback);
    }
}

export default new Broker();
