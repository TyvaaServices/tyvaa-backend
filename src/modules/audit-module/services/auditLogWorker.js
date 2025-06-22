import auditLogQueue from '../../../utils/auditLogQueue.js';
import AuditLog from '../models/auditLog.js';

const BATCH_SIZE = 100;
const BATCH_INTERVAL = 2000; // 2 seconds

let batch = [];
let batchTimeout = null;

async function flushBatch() {
    if (batch.length === 0) return;
    const logsToInsert = batch.splice(0, BATCH_SIZE);
    try {
        await AuditLog.bulkCreate(logsToInsert);
    } catch (err) {
        console.error('Failed to batch-insert audit logs:', err);
    }
}

auditLogQueue.process(async (job) => {
    batch.push(job.data);
    if (batch.length >= BATCH_SIZE) {
        await flushBatch();
        clearTimeout(batchTimeout);
        batchTimeout = null;
    } else if (!batchTimeout) {
        batchTimeout = setTimeout(async () => {
            await flushBatch();
            batchTimeout = null;
        }, BATCH_INTERVAL);
    }
});

process.on('SIGINT', async () => {
    await flushBatch();
    process.exit(0);
});
