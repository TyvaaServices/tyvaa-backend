import sequelize from "./../../../config/db.js";
import { DataTypes } from "sequelize";

/**
 * @file Defines the AuditAction model for categorizing audit log actions.
 * @typedef {Object} AuditActionAttributes
 * @property {number} id - The unique identifier for the audit action.
 * @property {("create"|"update"|"delete"|"login"|"logout"|"access")} actionType - The type of action performed.
 * @property {string} description - A description of the action type.
 */

/**
 * Sequelize model for AuditAction.
 * Represents different types of actions that can be logged in the audit system.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<AuditActionAttributes, any> & AuditActionAttributes>}
 */

const AuditAction = sequelize.define(
    "AuditAction",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        actionType: {
            type: DataTypes.ENUM(
                "create",
                "update",
                "delete",
                "view",
                "exportsData",
                "login",
                "logout"
            ),
            allowNull: false,
        },
        codeAction: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
    },
    {
        tableName: "audit_actions",
        timestamps: false,
    }
);

export default AuditAction;
