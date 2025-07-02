import { DataTypes } from "sequelize";
import sequelize from "./../../../config/db.js";

/**
 * @file Defines the Booking model for storing ride booking information.
 * @typedef {Object} BookingAttributes
 * @property {number} id - The unique identifier for the booking.
 * @property {number} rideInstanceId - The ID of the ride instance being booked. Foreign key to ride_instances.
 * @property {number} seatsBooked - The number of seats booked by the user.
 * @property {("booked"|"cancelled")} status - The current status of the booking. Defaults to "booked".
 */

/**
 * Sequelize model for Booking.
 * Represents a booking made by a user for a specific ride instance.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<BookingAttributes, any> & BookingAttributes>}
 */
const Booking = sequelize.define(
    "Booking",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        rideInstanceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "ride_instances",
                key: "id",
            },
        },
        seatsBooked: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
            },
        },
        status: {
            type: DataTypes.ENUM("booked", "cancelled"),
            defaultValue: "booked",
        },
    },
    {
        tableName: "bookings",
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ["userId", "rideInstanceId"],
            },
        ],
    }
);

export default Booking;
