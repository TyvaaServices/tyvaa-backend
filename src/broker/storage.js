// FileStorage is a simple persistent storage for queue messages using the filesystem.
// It saves each queue's messages in a separate .jsonl file (one JSON object per line).
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
        const lines = fs.readFileSync(file, "utf-8").trim().split("\n");
        return lines.map((line) => JSON.parse(line));
    }
}

export default FileStorage;
