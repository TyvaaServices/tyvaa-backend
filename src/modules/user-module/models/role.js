import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";
import Permission from "./permission.js"; // Import Permission model

/**
 * Sequelize model for Role.
 * Represents a user role in the system (e.g., PASSAGER, CHAUFFEUR, ADMINISTRATEUR).
 *
 * @typedef {Object} Role
 * @property {number} id - The unique identifier for the role.
 * @property {string} name - The name of the role.
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

// Define Many-to-Many relationship between Role and Permission
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
