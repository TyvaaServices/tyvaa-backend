import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

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
