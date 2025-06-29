import fs from "fs";
import path from "path";

class FileStorage {
    constructor(dir = "./queues") {
        this.dir = dir;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    }

    save(queue, message) {
        const file = path.join(this.dir, `${queue}.jsonl`);
        fs.appendFileSync(file, JSON.stringify(message) + "\n");
    }

    load(queue) {
        const file = path.join(this.dir, `${queue}.jsonl`);
        if (!fs.existsSync(file)) return [];
        const lines = fs.readFileSync(file, "utf-8").trim().split("\n");
        return lines.map((line) => JSON.parse(line));
    }
}

export default FileStorage;
