import AuditLog from '../models/auditLog.js';
import AuditAction from '../models/actionType.js';
import {z} from 'zod';
import {User} from "#config/index.js";

const auditLogSchema = z.object({
    entityId: z.number().optional(),
    entityType: z.string().min(1, {message: "Entity type is required"}),
    description: z.string().min(1, {message: "Description is required"}),
    actionTypeId: z.number({message: "Action type ID is required"}),
    ipAddress: z.string().optional()
});

// Validation schema for action type data
const actionTypeSchema = z.object({
    actionType: z.enum(['create', 'update', 'delete', 'view', 'exportsData', 'login', 'logout'], {
        message: "Action type must be one of: create, update, delete, view, exportsData, login, logout"
    }),
    codeAction: z.string().min(1, {message: "Code action is required"})
});

/**
 * Create a new audit log entry
 * @param {Object} data - The audit log data
 * @returns {Promise<Object>} The created audit log
 */
async function createAuditLog(data) {
    try {
        // Validate the input data
        const validationResult = auditLogSchema.safeParse(data);
        if (!validationResult.success) {
            throw new Error(`Audit log validation failed: ${JSON.stringify(validationResult.error.errors)}`);
        }

        return await AuditLog.create(validationResult.data);
    } catch (error) {
        console.error(`Failed to create audit log: ${error.message}`);
        throw error;
    }
}

/**
 * Log user authentication events (login/logout)
 * @param {Object} data - Authentication data
 * @param {string} data.entityType - Usually 'user' or 'admin'
 * @param {number} data.entityId - User or admin ID
 * @param {string} data.action - 'login' or 'logout'
 * @param {boolean} data.success - Whether authentication was successful
 * @param {string} data.ipAddress - IP address of the request
 * @returns {Promise<Object>} The created audit log
 */
async function logAuthentication(data) {
    try {
        const actionType = await AuditAction.findOne({
            where: {
                actionType: data.action // 'login' or 'logout'
            }
        });

        if (!actionType) {
            throw new Error(`Action type '${data.action}' not found`);
        }

        // Create description based on success/failure
        const actionDesc = data.action === 'login' ? 'Login' : 'Logout';
        const statusDesc = data.success ? 'successful' : 'failed';
        const description = `${actionDesc} ${statusDesc} for ${data.entityType} ID: ${data.entityId}`;

        return await createAuditLog({
            entityId: data.entityId,
            entityType: data.entityType,
            description: description,
            actionTypeId: actionType.id,
            ipAddress: data.ipAddress
        });
    } catch (error) {
        console.error(`Failed to log authentication: ${error.message}`);
        throw error;
    }
}

/**
 * Get all audit log entries
 * @returns {Promise<Array>} All audit logs
 */
async function getAllAuditLogs() {
    try {
        return await AuditLog.findAll({
            order: [['timestamp', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                // attributes: ['id', 'fullName', 'email']
            }]
        });
    } catch (error) {
        console.error(`Failed to fetch audit logs: ${error.message}`);
        throw error;
    }
}

/**
 * Get audit log by ID
 * @param {number} id - The audit log ID
 * @returns {Promise<Object|null>} The audit log or null if not found
 */
async function getAuditLogById(id) {
    try {
        return await AuditLog.findByPk(id);
    } catch (error) {
        console.error(`Failed to fetch audit log: ${error.message}`);
        throw error;
    }
}

/**
 * Get all action types
 * @returns {Promise<Array>} All action types
 */
async function getAllActionTypes() {
    try {
        return await AuditAction.findAll();
    } catch (error) {
        console.error(`Failed to fetch action types: ${error.message}`);
        throw error;
    }
}

/**
 * Create a new action type
 * @param {Object} data - The action type data
 * @returns {Promise<Object>} The created action type
 */
async function createActionType(data) {
    try {
        // Validate the input data
        const validationResult = actionTypeSchema.safeParse(data);
        if (!validationResult.success) {
            throw new Error(`Action type validation failed: ${JSON.stringify(validationResult.error.errors)}`);
        }

        return await AuditAction.create(validationResult.data);
    } catch (error) {
        console.error(`Failed to create action type: ${error.message}`);
        throw error;
    }
}

// Export the audit service
export default {
    createAuditLog,
    getAllAuditLogs,
    getAuditLogById,
    getAllActionTypes,
    createActionType,
    logAuthentication
};
