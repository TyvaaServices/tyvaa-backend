import fp from 'fastify-plugin';
import AuditLog from '../models/auditLog.js';

const auditPlugin = fp(async function (fastify, opts) {
    const auditLogBuffer = [];

    async function flushAuditLogs() {
        if (auditLogBuffer.length === 0) return;

        const logsToInsert = auditLogBuffer.splice(0);

        try {
            await AuditLog.bulkCreate(logsToInsert);
            fastify.log.info(`Flushed ${logsToInsert.length} audit logs`);
        } catch (err) {
            fastify.log.error('Failed to bulk insert audit logs:', err);
            auditLogBuffer.push(...logsToInsert);
        }
    }

    const interval = setInterval(flushAuditLogs, 5000);

    fastify.addHook('onClose', async (fastifyInstance, done) => {
        clearInterval(interval);
        await flushAuditLogs();
        done();
    });

    fastify.decorateRequest('logAdminAction', async function (logEntry) {
        auditLogBuffer.push({
            ...logEntry,
            timestamp: new Date(),
        });
    });
});

export default auditPlugin;
