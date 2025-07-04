import { DataTypes } from "sequelize";
import sequelize from "./../../../config/db.js";

/**
 * @file Defines the RideInstance model for specific ride occurrences.
 * @typedef {Object} RideInstanceAttributes
 * @property {number} id - The unique identifier for the ride instance.
 * @property {number} rideId - The ID of the ride template. Foreign key to rides.
 * @property {Date} rideDate - The specific date and time for this ride occurrence.
 * @property {number} seatsAvailable - The number of seats available for this instance.
 * @property {number} seatsBooked - The number of seats already booked for this instance.
 * @property {("scheduled"|"in_progress"|"completed"|"cancelled")} status - The current status of the ride instance.
 */

/**
 * Sequelize model for RideInstance.
 * Represents a specific occurrence of a ride template at a particular date and time.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<RideInstanceAttributes, any> & RideInstanceAttributes>}
 */

const RideInstance = sequelize.define(
    "RideInstance",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        rideId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "rides",
                key: "id",
            },
        },
        rideDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        seatsAvailable: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        seatsBooked: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM("scheduled", "cancelled", "completed"),
            defaultValue: "scheduled",
        },
    },
    {
        tableName: "ride_instances",
        indexes: [
            {
                unique: true,
                fields: ["rideId", "rideDate"],
            },
        ],
    }
);

export default RideInstance;
