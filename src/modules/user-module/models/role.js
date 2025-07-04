import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";
import Permission from "./permission.js";

/**
 * @file Defines the Role model for role-based access control.
 * @typedef {Object} RoleAttributes
 * @property {number} id - The unique identifier for the role.
 * @property {string} name - The name of the role (e.g., 'PASSAGER', 'CHAUFFEUR', 'ADMINISTRATEUR').
 * @property {string} [description] - A detailed description of the role's purpose.
 */

/**
 * Sequelize model for Role.
 * Represents a user role in the RBAC system with associated permissions.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<RoleAttributes, any> & RoleAttributes>}
 */

const Role = sequelize.define(
    "Role",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true, // e.g., 'PASSAGER', 'CHAUFFEUR', 'ADMINISTRATEUR'
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt timestamps
    }
);

/**
 * Sets up a many-to-many association between Role and Permission models.
 * This creates a join table `RolePermissions`.
 */
Role.belongsToMany(Permission, {
    through: "RolePermissions",
    foreignKey: "roleId",
    otherKey: "permissionId",
    timestamps: false, // No timestamps for the join table itself
});

/**
 * Sets up a many-to-many association between Permission and Role models.
 * This creates a join table `RolePermissions`.
 */
Permission.belongsToMany(Role, {
    through: "RolePermissions",
    foreignKey: "permissionId",
    otherKey: "roleId",
    timestamps: false,
});

export default Role;
