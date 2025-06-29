import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

/**
 * Sequelize model for PassengerProfile.
 * Represents a passenger's profile in the system.
 *
 * @typedef {Object} PassengerProfile
 * @property {number} id - The unique identifier for the passenger profile.
 * @property {number} passengerNote - The passenger's note/rating.
 * @property {number} userId - The user ID associated with this profile.
 */

const PassengerProfile = sequelize.define("PassengerProfile", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    passengerNote: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
});
export default PassengerProfile;
