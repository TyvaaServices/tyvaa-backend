import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config();

async function clearQueue(queueName) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  const result = await redis.del(queueName);
  console.log(`Deleted queue '${queueName}', result:`, result);
}

clearQueue("notification_created").catch(console.error);
