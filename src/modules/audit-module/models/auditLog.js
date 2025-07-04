import sequelize from "./../../../config/db.js";
import { DataTypes } from "sequelize";

/**
 * @file Defines the AuditLog model for tracking system changes and actions.
 * @typedef {Object} AuditLogAttributes
 * @property {number} id - The unique identifier for the audit log entry.
 * @property {number} entityId - The ID of the entity that was affected (nullable).
 * @property {string} entityType - The type of entity that was affected (e.g., 'User', 'Booking').
 * @property {string} action - The action that was performed (e.g., 'CREATE', 'UPDATE', 'DELETE').
 * @property {Object} changes - JSON object containing the changes made.
 * @property {number} userId - The ID of the user who performed the action.
 * @property {Date} timestamp - When the action was performed.
 * @property {string} ipAddress - The IP address from which the action was performed.
 * @property {string} userAgent - The user agent string from the request.
 */

/**
 * Sequelize model for AuditLog.
 * Represents a log entry for tracking changes and actions in the system.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<AuditLogAttributes, any> & AuditLogAttributes>}
 */

const AuditLog = sequelize.define(
    "AuditLog",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        entityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        entityType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        actionTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "audit_logs",
        timestamps: false,
        indexes: [
            {
                fields: ["entityId", "entityType"],
            },
            {
                name: "idx_audit_logs_actionTypeId",
                fields: ["actionTypeId"],
            },
            {
                name: "idx_audit_logs_entityType_entityId",
                fields: ["entityType", "entityId"],
            },
        ],
    }
);

export default AuditLog;
