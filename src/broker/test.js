import broker from "./broker.js";

broker.subscribe("my-queue", (msg) => {
    console.log("Received on my-queue:", msg);
    broker.getQueue("my-queue").acknowledge(msg.messageId);
});

const messageId = broker.publish("my-queue", { text: "Hello, World!" });
console.log("Published messageId:", messageId);

console.log("\n--- Fanout Example ---");
broker.subscribe("fanout-queue", (msg) => {
    console.log("Subscriber 1 got:", msg.text);
});
broker.subscribe("fanout-queue", (msg) => {
    console.log("Subscriber 2 got:", msg.text);
});
broker.publish("fanout-queue", { text: "Broadcast message" });

console.log("\n--- Delivery Tracking Example ---");
const trackId = broker.publish("track-queue", { text: "Track me!" });
const queue = broker.getQueue("track-queue");
console.log(
    "Before ack, acknowledged:",
    queue.messages.find((m) => m.messageId === trackId).acknowledged
);
queue.acknowledge(trackId);
console.log(
    "After ack, acknowledged:",
    queue.messages.find((m) => m.messageId === trackId).acknowledged
);
