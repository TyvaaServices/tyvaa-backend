import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config();

async function inspectQueue(queueName) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  const messages = await redis.lrange(queueName, 0, -1);
  console.log(`Contents of queue '${queueName}':`);
  messages.forEach((msg, idx) => {
    console.log(`  [${idx}]:`, msg);
  });
}

inspectQueue("notification_created").catch(console.error);
