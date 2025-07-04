import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

/**
 * @file Defines the DriverProfile model for driver-specific data.
 * @typedef {Object} DriverProfileAttributes
 * @property {number} id - The unique identifier for the driver profile.
 * @property {number} driverNote - The driver's average rating/note from passengers.
 * @property {("Active"|"Suspended")} statusProfile - The current status of the driver profile.
 * @property {number} userId - The user ID associated with this profile. Foreign key to users.
 */

/**
 * Sequelize model for DriverProfile.
 * Represents a driver's profile with ride history, rating, and status information.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<DriverProfileAttributes, any> & DriverProfileAttributes>}
 */

const DriverProfile = sequelize.define("ProfilChauffeur", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    driverNote: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
    },
    statusProfile: {
        type: DataTypes.ENUM("Active", "Suspended"),
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
});
export default DriverProfile;
