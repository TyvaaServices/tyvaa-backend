import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

/**
 * Sequelize model for Permission.
 * Represents a permission in the system (e.g., 'reserver_trajet', 'publier_trajet').
 *
 * @typedef {Object} Permission
 * @property {number} id - The unique identifier for the permission.
 * @property {string} name - The name of the permission.
 * @property {string} [description] - The description of the permission.
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
