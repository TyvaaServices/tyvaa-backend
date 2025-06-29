import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

/**
 * Sequelize model for DriverProfile (ProfilChauffeur).
 * Represents a driver's profile in the system.
 *
 * @typedef {Object} DriverProfile
 * @property {number} id - The unique identifier for the driver profile.
 * @property {number} driverNote - The driver's note/rating.
 * @property {string} statusProfile - The status of the driver profile (Active or Suspended).
 * @property {number} userId - The user ID associated with this profile.
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
