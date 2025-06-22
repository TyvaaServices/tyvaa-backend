import { auditQueue } from "./../Queues/auditQueue.js";
import { validateAuditLog } from "./../validations/auditValidation.js";
import AuditAction from "./../models/actionType.js"; // or however you're exporting it
import RedisCache from "#utils/redisCache.js";

const ACTION_CACHE_TTL = 86400; // 1 day

async function getActionTypeId(action) {
    const cacheKey = `audit:actionTypeId:${action}`;
    let id = await RedisCache.get(cacheKey);

    if (!id) {
        const found = await AuditAction.findOne({ where: { actionType: action } });
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
        const actionTypeId = await getActionTypeId(action);
        const logEntry = validateAuditLog({ entityId, entityType, description, actionTypeId, ipAddress });

        await auditQueue.add(logEntry); // queued to Redis
    },

    /**
     * Log user login/logout specifically
     */
    logAuthentication: async ({ entityType, entityId, action, success, ipAddress }) => {
        const statusDesc = success ? "successful" : "failed";
        const description = `${action.charAt(0).toUpperCase() + action.slice(1)} ${statusDesc} for ${entityType} ID: ${entityId}`;
        return await auditService.log({ entityId, entityType, action, description, ipAddress });
    }
};
