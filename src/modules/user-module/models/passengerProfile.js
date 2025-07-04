import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

/**
 * @file Defines the PassengerProfile model for passenger-specific data.
 * @typedef {Object} PassengerProfileAttributes
 * @property {number} id - The unique identifier for the passenger profile.
 * @property {number} passengerNote - The passenger's average rating/note from drivers.
 * @property {number} userId - The user ID associated with this profile. Foreign key to users.
 */

/**
 * Sequelize model for PassengerProfile.
 * Represents a passenger's profile with ride history and rating information.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<PassengerProfileAttributes, any> & PassengerProfileAttributes>}
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
