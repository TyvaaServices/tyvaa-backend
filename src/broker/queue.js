class Queue {
    constructor(name, storage) {
        this.name = name;
        this.storage = storage;
        this.subscribers = [];
        this.messages = this.storage.load(name);
    }

    publish(msg) {
        this.storage.save(this.name, msg);
        this.messages.push(msg);
        this.notify(msg);
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notify(msg) {
        this.subscribers.forEach((cb) => cb(msg));
    }
}

export default Queue;
