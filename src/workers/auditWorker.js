import { auditQueue } from "./../modules/audit-module/Queues/auditQueue.js";
import AuditLog from "./../modules/audit-module/models/auditLog.js";
import sequelize from "#config/db.js";

auditQueue.process(async (jobs) => {
    const logs = jobs.map(job => job.data);

    try {
        await sequelize.transaction(async (t) => {
            await AuditLog.bulkCreate(logs, { transaction: t });
        });
    } catch (err) {
        console.error("Failed to insert audit logs:", err);
    }
});
