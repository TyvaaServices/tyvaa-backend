import broker from "./broker.js";

console.log("🚀 Starting Advanced Broker Test Suite\n");

// Test 1: Basic FIFO with acknowledgment
console.log("📋 Test 1: Basic FIFO Processing");
broker.subscribe("fifo-test", async (msg) => {
    console.log(`   Processing: ${msg.text} (ID: ${msg.messageId})`);
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));
    broker.acknowledge("fifo-test", msg.messageId);
    console.log(`   ✅ Completed: ${msg.text}`);
});

// Publish messages in order
["First", "Second", "Third"].forEach((text, index) => {
    broker.publish("fifo-test", { text: `${text} Message` });
});

// Test 2: Delayed Messages
console.log("\n⏰ Test 2: Delayed Messages");
broker.subscribe("delayed-test", (msg) => {
    console.log(
        `   Delayed message received: ${msg.text} at ${new Date().toISOString()}`
    );
    broker.acknowledge("delayed-test", msg.messageId);
});

console.log(`   Publishing delayed message at ${new Date().toISOString()}`);
broker.publishDelayed(
    "delayed-test",
    { text: "This message was delayed by 2 seconds" },
    2000
);

// Test 3: Priority Messages
console.log("\n🎯 Test 3: Priority Messages");
broker.subscribe("priority-test", (msg) => {
    console.log(
        `   Priority ${msg.priority}: ${msg.text} (ID: ${msg.messageId})`
    );
    broker.acknowledge("priority-test", msg.messageId);
});

// Publish with different priorities (higher number = higher priority)
broker.publishPriority("priority-test", { text: "Low Priority" }, 1);
broker.publishPriority("priority-test", { text: "High Priority" }, 10);
broker.publishPriority("priority-test", { text: "Medium Priority" }, 5);
broker.publish("priority-test", { text: "Default Priority" }); // priority 0

// Test 4: Retry Logic with Failure Simulation
console.log("\n🔄 Test 4: Retry Logic");
let attemptCount = 0;
broker.subscribe("retry-test", async (msg) => {
    attemptCount++;
    console.log(
        `   Attempt ${attemptCount} for: ${msg.text} (Retry: ${msg.retries})`
    );

    if (attemptCount < 3) {
        // Simulate failure for first 2 attempts
        throw new Error("Simulated processing failure");
    } else {
        // Success on 3rd attempt
        console.log(`   ✅ Success on attempt ${attemptCount}`);
        broker.acknowledge("retry-test", msg.messageId);
    }
});

broker.publish("retry-test", {
    text: "Message that will fail twice then succeed",
});

// Test 5: Dead Letter Queue
console.log("\n💀 Test 5: Dead Letter Queue");
broker.subscribe("dead-letter-test", async (msg) => {
    console.log(`   Processing message that will always fail: ${msg.text}`);
    throw new Error("This message will always fail");
});

broker.publish("dead-letter-test", {
    text: "This message will go to dead letter queue",
});

// Test 6: Fanout Exchange
console.log("\n📡 Test 6: Fanout Exchange");
["fanout-queue-1", "fanout-queue-2", "fanout-queue-3"].forEach(
    (queueName, index) => {
        broker.subscribe(queueName, (msg) => {
            console.log(`   ${queueName} received: ${msg.text}`);
            broker.acknowledge(queueName, msg.messageId);
        });
    }
);

broker.fanout(["fanout-queue-1", "fanout-queue-2", "fanout-queue-3"], {
    text: "Broadcast to all queues",
});

// Test 7: Event Monitoring
console.log("\n📊 Test 7: Event Monitoring");
broker.on("message-published", (data) => {
    console.log(
        `   📤 Message published to ${data.queueName}: ${data.messageId}`
    );
});

broker.on("message-processing", (data) => {
    console.log(
        `   ⚙️  Processing message in ${data.queueName}: ${data.messageId}`
    );
});

broker.on("message-completed", (data) => {
    console.log(
        `   ✅ Message completed in ${data.queueName}: ${data.messageId}`
    );
});

broker.on("message-error", (data) => {
    console.log(`   ❌ Message error in ${data.queueName}: ${data.error}`);
});

broker.on("message-retry-scheduled", (data) => {
    console.log(
        `   🔄 Retry scheduled for ${data.queueName}: attempt ${data.retryCount}`
    );
});

broker.on("message-dead-letter", (data) => {
    console.log(`   💀 Message moved to dead letter: ${data.messageId}`);
});

// Test 8: Statistics and Monitoring
setTimeout(() => {
    console.log("\n📈 Test 8: Queue Statistics");
    const stats = broker.getStats();
    console.log("   Broker Stats:", JSON.stringify(stats, null, 2));

    console.log("\n💀 Dead Letter Messages:");
    const deadLetters = broker.getDeadLetterMessages();
    console.log("   Dead Letters:", JSON.stringify(deadLetters, null, 2));
}, 8000);

// Test 9: Requeue Dead Letters
setTimeout(() => {
    console.log("\n🔄 Test 9: Requeue Dead Letters");
    const requeuedCount = broker.requeueDeadLetters("dead-letter-test");
    console.log(`   Requeued ${requeuedCount} dead letter messages`);
}, 10000);

// Test 10: Cleanup and Final Stats
setTimeout(() => {
    console.log("\n🧹 Test 10: Cleanup and Final Stats");

    // Purge completed messages
    const purgeResults = broker.purgeCompleted();
    console.log("   Purged messages:", purgeResults);

    // Final stats
    const finalStats = broker.getStats();
    console.log("   Final Stats:", JSON.stringify(finalStats, null, 2));

    console.log("\n🎉 Test Suite Completed!");

    // Clean shutdown
    setTimeout(() => {
        broker.destroy();
        process.exit(0);
    }, 2000);
}, 15000);

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down gracefully...");
    broker.destroy();
    process.exit(0);
});
