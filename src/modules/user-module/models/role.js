import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";
import Permission from "./permission.js"; // Import Permission model

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
// This will create a join table `RolePermissions`
Role.belongsToMany(Permission, {
    through: "RolePermissions",
    foreignKey: "roleId",
    otherKey: "permissionId",
    timestamps: false, // No timestamps for the join table itself
});

Permission.belongsToMany(Role, {
    through: "RolePermissions",
    foreignKey: "permissionId",
    otherKey: "roleId",
    timestamps: false,
});

export default Role;
