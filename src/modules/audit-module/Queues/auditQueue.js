import Queue from "bull";
import {Redis} from '@upstash/redis';
export const auditQueue = new Queue("audit-queue", Redis.fromEnv()||"redis://localhost:6379");
