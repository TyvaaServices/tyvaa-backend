import fs from "fs";
import path from "path";

class FileStorage {
    /**
     * @param {string} dir - Directory where queue files are stored. Defaults to './queues'.
     */
    constructor(dir = "./queues") {
        this.dir = dir;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    }

    /**
     * Appends a message to the queue's file.
     * @param {string} queue - The queue name.
     * @param {Object} message - The message object to store.
     */
    save(queue, message) {
        const file = path.join(this.dir, `${queue}.jsonl`);
        fs.appendFileSync(file, JSON.stringify(message) + "\n");
    }

    /**
     * Loads all messages for a queue from its file.
     * @param {string} queue - The queue name.
     * @returns {Object[]} Array of message objects.
     */
    load(queue) {
        const file = path.join(this.dir, `${queue}.jsonl`);
        if (!fs.existsSync(file)) return [];

        const content = fs.readFileSync(file, "utf-8").trim();
        if (!content) return [];

        const lines = content.split("\n");
        const messages = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
                try {
                    messages.push(JSON.parse(trimmedLine));
                } catch (error) {
                    console.warn(
                        `Warning: Failed to parse line in ${file}: ${trimmedLine}`
                    );
                    // Skip malformed lines and continue
                }
            }
        }

        return messages;
    }
}

export default FileStorage;
