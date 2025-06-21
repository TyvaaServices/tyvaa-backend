import * as auditController from '../controllers/auditController.js';

function auditRoutes(fastify, options, done) {
    // Audit Logs routes
    fastify.post('/audit-logs', auditController.createAuditLog);
    fastify.get('/audit-logs', auditController.getAllAuditLogs);
    fastify.get('/audit-logs/:id', auditController.getAuditLogById);

    // Audit Action Types routes
    fastify.get('/audit-actions', auditController.getAllActionTypes);
    fastify.post('/audit-actions', auditController.createActionType);

    done();
}

export default auditRoutes;
