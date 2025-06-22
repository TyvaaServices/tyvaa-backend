import Queue from 'bull';
const auditLogQueue = new Queue('audit-log', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export default auditLogQueue;

