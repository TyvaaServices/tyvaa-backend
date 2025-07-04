import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

/**
 * @file Defines the Permission model for role-based access control.
 * @typedef {Object} PermissionAttributes
 * @property {number} id - The unique identifier for the permission.
 * @property {string} name - The name of the permission (e.g., 'reserver_trajet', 'publier_trajet').
 * @property {string} [description] - A detailed description of what this permission allows.
 */

/**
 * Sequelize model for Permission.
 * Represents a permission in the RBAC system for controlling user access to features.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<PermissionAttributes, any> & PermissionAttributes>}
 */

const Permission = sequelize.define(
    "Permission",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true, // e.g., 'reserver_trajet', 'publier_trajet'
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt timestamps
    }
);

export default Permission;
