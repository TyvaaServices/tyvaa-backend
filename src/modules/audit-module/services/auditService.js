import { validateAuditLog } from "./../validations/auditValidation.js";
import AuditAction from "./../models/actionType.js";
import RedisCache from "#utils/redisCache.js";
import createLogger from "#utils/logger.js";
const logger = createLogger("auditService");
const ACTION_CACHE_TTL = 86400; // 1 day

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

    return parseInt(id);
}

export const auditService = {
    /**
     * Enqueue log entry
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

            await getActionTypeId(action);
            validateAuditLog({
                entityId: parsedEntityId,
                entityType,
                description,
                actionTypeId,
                ipAddress,
            });

            logger.info("Successfully enqueued audit log.", {
                action,
                entityType,
            });
        } catch (e) {
            logger.error(`Failed to log audit entry: ${e.message}`, {
                error: e,
                entityId,
                entityType,
                action,
                ipAddress,
            });
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
