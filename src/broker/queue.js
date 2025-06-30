import fs from "fs";

class Queue {
    /**
     * @param {string} name - The queue name.
     * @param {FileStorage} storage - The storage backend for persisting messages.
     */
    constructor(name, storage) {
        this.name = name;
        this.storage = storage;
        this.subscribers = [];
        this.messages = this.storage.load(name);
    }

    /**
     * Publishes a message to the queue, persists it, and notifies subscribers.
     * Returns a messageId for tracking.
     * @param {Object} msg - The message to publish.
     * @returns {string} messageId
     */
    publish(msg) {
        const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const messageWithId = { ...msg, messageId, acknowledged: false };
        this.storage.save(this.name, messageWithId);
        this.messages.push(messageWithId);
        this.notify(messageWithId);
        return messageId;
    }

    /**
     * Acknowledge a message by messageId.
     * @param {string} messageId
     */
    acknowledge(messageId) {
        const msg = this.messages.find((m) => m.messageId === messageId);
        if (msg) {
            msg.acknowledged = true;
            // Persist all messages to disk (overwrite file)
            const file = this.storage.dir + "/" + this.name + ".jsonl";

            fs.writeFileSync(
                file,
                this.messages.map((m) => JSON.stringify(m)).join("\n") + "\n"
            );
        }
    }

    /**
     * Subscribes a callback to receive new messages.
     * @param {function(Object):void} callback - Function called with each new message.
     */
    subscribe(callback) {
        this.subscribers.push(callback);
    }

    /**
     * Notifies all subscribers of a new message.
     * @param {Object} msg - The message to send to subscribers.
     */
    notify(msg) {
        this.subscribers.forEach((cb) => cb(msg));
    }
}

export default Queue;
