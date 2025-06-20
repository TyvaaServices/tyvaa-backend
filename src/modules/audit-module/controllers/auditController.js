import auditService from '../services/auditService.js';
import {
  createAuditLogSchema,
  getAuditLogByIdSchema,
  createActionTypeSchema
} from '../validations/auditValidation.js';

async function createAuditLog(request, reply) {
    try {
        const auditLogData = request.body;

        // Validate the input data
        const validationResult = createAuditLogSchema.safeParse(auditLogData);
        if (!validationResult.success) {
            return reply.code(400).send({
                success: false,
                message: 'Validation error',
                errors: validationResult.error.errors
            });
        }

        const result = await auditService.createAuditLog(validationResult.data);
        return reply.code(201).send({
            success: true,
            data: result
        });
    } catch (error) {
        request.log.error(`Error creating audit log: ${error.message}`);
        return reply.code(500).send({
            success: false,
            message: error.message
        });
    }
}

async function getAllAuditLogs(request, reply) {
    try {
        const auditLogs = await auditService.getAllAuditLogs();
        return reply.code(200).send({
            success: true,
            data: auditLogs
        });
    } catch (error) {
        request.log.error(`Error fetching audit logs: ${error.message}`);
        return reply.code(500).send({
            success: false,
            message: error.message
        });
    }
}

async function getAuditLogById(request, reply) {
    try {
        const { id } = request.params;

        const validationResult = getAuditLogByIdSchema.safeParse({ id: parseInt(id) });
        if (!validationResult.success) {
            return reply.code(400).send({
                success: false,
                message: 'Validation error',
                errors: validationResult.error.errors
            });
        }

        const auditLog = await auditService.getAuditLogById(validationResult.data.id);

        if (!auditLog) {
            return reply.code(404).send({
                success: false,
                message: `Audit log with ID ${id} not found`
            });
        }

        return reply.code(200).send({
            success: true,
            data: auditLog
        });
    } catch (error) {
        request.log.error(`Error fetching audit log: ${error.message}`);
        return reply.code(500).send({
            success: false,
            message: error.message
        });
    }
}

async function getAllActionTypes(request, reply) {
    try {
        const actionTypes = await auditService.getAllActionTypes();
        return reply.code(200).send({
            success: true,
            data: actionTypes
        });
    } catch (error) {
        request.log.error(`Error fetching action types: ${error.message}`);
        return reply.code(500).send({
            success: false,
            message: error.message
        });
    }
}

async function createActionType(request, reply) {
    try {
        const actionTypeData = request.body;

        const validationResult = createActionTypeSchema.safeParse(actionTypeData);
        if (!validationResult.success) {
            return reply.code(400).send({
                success: false,
                message: 'Validation error',
                errors: validationResult.error.errors
            });
        }

        const result = await auditService.createActionType(validationResult.data);
        return reply.code(201).send({
            success: true,
            data: result
        });
    } catch (error) {
        request.log.error(`Error creating action type: ${error.message}`);
        return reply.code(500).send({
            success: false,
            message: error.message
        });
    }
}

export {
    createAuditLog,
    getAllAuditLogs,
    getAuditLogById,
    getAllActionTypes,
    createActionType
};
