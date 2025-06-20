const { z } = require('zod');


// Validation schema for audit log data
const auditLogSchema = z.object({
    entityId: z.number().optional(),
    entityType: z.string().min(1, { message: "Entity type is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    actionTypeId: z.number().positive({ message: "Action type ID must be a positive number" }),
}).passthrough();

// Validation schema for action type data
const actionTypeSchema = z.object({
    actionType: z.enum(['create', 'update', 'delete', 'view', 'exportsData', 'login', 'logout'], {
        message: "Action type must be one of: create, update, delete, view, exportsData, login, logout"
    }),
    codeAction: z.string().optional()
}).strict();


// Schema for creating an audit log
const createAuditLogSchema = z.object({
  entityId: z.number().optional(),
  entityType: z.string().min(1, { message: "Entity type is required" }),
  description: z.string().min(1, { message: "Description is required" }),
    actionTypeId: z.number().positive({ message: "Action type ID must be a positive number" }),
}).passthrough();

const getAuditLogByIdSchema = z.object({
  id: z.number().positive({ message: "ID must be a positive number" })
}).strict();

// Schema for creating an action type
const createActionTypeSchema = z.object({
  actionType: z.enum(['create', 'update', 'delete', 'view', 'exportsData', 'login', 'logout'], {
    message: "Action type must be one of: create, update, delete, view, exportsData, login, logout"
  }),
  codeAction: z.string().min(1, { message: "Code action is required" })
}).passthrough();

module.exports = {
  createAuditLogSchema,
  getAuditLogByIdSchema,
  createActionTypeSchema
};
