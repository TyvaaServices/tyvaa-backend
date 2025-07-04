import { validateAuditLog } from "./../validations/auditValidation.js";
import AuditAction from "./../models/actionType.js";
import RedisCache from "#utils/redisCache.js";
import createLogger from "#utils/logger.js";
import { AuditLog } from "#config/index.js";

const logger = createLogger("auditService");
const ACTION_CACHE_TTL = 86400;

async function getActionTypeId(action) {
    const cacheKey = `audit:actionTypeId:${action}`;
    let id = await RedisCache.get(cacheKey);

    if (!id) {
        const found = await AuditAction.findOne({
            where: { actionType: action },
        });
        if (!found) throw new Error(`Invalid action type: ${action}`);
        id = found.id;
        await RedisCache.set(cacheKey, id, ACTION_CACHE_TTL);
    }

    return parseInt(id, 10);
}

export const auditService = {
    /**
     * Enqueue log entry in Redis (to be bulk inserted later)
     */
    log: async ({ entityId, entityType, description, action, ipAddress }) => {
        try {
            const parsedEntityId = entityId
                ? parseInt(entityId, 10)
                : undefined;
            if (entityId && isNaN(parsedEntityId)) {
                logger.warn(
                    "Invalid entityId: must be a number. Proceeding without it.",
                    { entityId }
                );
            }

            const actionTypeId = await getActionTypeId(action);
            const auditActionData = validateAuditLog({
                entityId: parsedEntityId,
                entityType,
                description,
                actionTypeId,
                ipAddress,
            });
            await RedisCache.lpush(
                "audit:pending",
                JSON.stringify(auditActionData)
            );
            logger.info("Queued audit log in Redis.", {
                action,
                entityType,
            });
            return auditActionData;
        } catch (e) {
            logger.error(`Failed to queue audit entry: ${e.message}`, {
                error: e,
                entityId,
                entityType,
                action,
                ipAddress,
            });
        }
    },

    /**
     * Bulk insert all pending audit logs from Redis to DB
     */
    bulkInsertFromRedis: async () => {
        try {
            let logs = [];
            while (true) {
                const log = await RedisCache.rpop("audit:pending");
                if (!log) break;
                logs.push(JSON.parse(log));
            }
            if (logs.length > 0) {
                await AuditLog.bulkCreate(logs);
                logger.info(
                    `Bulk inserted ${logs.length} audit logs from Redis.`
                );
            }
        } catch (e) {
            logger.error(`Failed to bulk insert audit logs: ${e.message}`);
        }
    },

    /**
     * Log user login/logout specifically
     */
    logAuthentication: async ({
        entityType,
        entityId,
        action,
        success,
        ipAddress,
    }) => {
        const statusDesc = success ? "successful" : "failed";
        const description = `${action.charAt(0).toUpperCase() + action.slice(1)} ${statusDesc} for ${entityType} ID: ${entityId}`;
        return await auditService.log({
            entityId,
            entityType,
            action,
            description,
            ipAddress,
        });
    },
};

setInterval(
    () => {
        auditService.bulkInsertFromRedis().then((r) => {
            if (r) {
                logger.info(
                    `Bulk insert completed at ${new Date().toISOString()}`
                );
            } else {
                logger.warn("No pending audit logs to insert.");
            }
        });
    },
    5 * 60 * 1000
);
