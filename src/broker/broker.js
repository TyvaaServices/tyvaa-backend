import Queue from "./queue";
import FileStorage from "./storage";

class Broker {
    constructor() {
        this.queues = {};
        this.storage = new FileStorage();
    }

    getQueue(name) {
        if (!this.queues[name]) {
            this.queues[name] = new Queue(name, this.storage);
        }
        return this.queues[name];
    }

    publish(queueName, msg) {
        this.getQueue(queueName).publish(msg);
    }

    subscribe(queueName, callback) {
        this.getQueue(queueName).subscribe(callback);
    }
}

export default new Broker();
