import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

/**
 * @file Defines the DriverApplication model for driver registration requests.
 * @typedef {Object} DriverApplicationAttributes
 * @property {number} id - The unique identifier for the driver application.
 * @property {("pending"|"approved"|"rejected")} status - The current status of the application.
 * @property {number} userId - The ID of the user applying to become a driver. Foreign key to users.
 * @property {Date} createdAt - When the application was submitted.
 * @property {Date} updatedAt - When the application was last updated.
 */

/**
 * Sequelize model for DriverApplication.
 * Represents a user's application to become a driver in the system.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<DriverApplicationAttributes, any> & DriverApplicationAttributes>}
 */

const DriverApplication = sequelize.define(
    "DriverApplication",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        status: {
            type: DataTypes.ENUM("pending", "approved", "rejected"),
            defaultValue: "pending",
            allowNull: false,
        },
        applicationDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false,
        },
        documents: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: "DriverApplications",
        timestamps: true,
    }
);

export default DriverApplication;
