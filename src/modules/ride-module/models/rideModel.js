import { DataTypes } from "sequelize";
import sequelize from "./../../../config/db.js";

/**
 * Sequelize model for RideModel (Ride Template).
 * Represents the template or definition of a ride, which can be recurring or a one-time offer.
 * Specific occurrences of these rides are managed as RideInstances.
 * @type {import('sequelize').ModelCtor<import('sequelize').Model<RideModelAttributes, any>>}
 */
const RideModel = sequelize.define(
    "RideModel",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        driverId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        departure: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        destination: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        seatsAvailable: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
            },
        },
        recurrence: {
            type: DataTypes.ARRAY(DataTypes.STRING), // ['Monday', 'Tuesday']
            allowNull: true,
        },
        comment: {
            type: DataTypes.TEXT,
            defaultValue: "",
        },
        price: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM("active", "cancelled", "completed"),
            defaultValue: "active",
        },
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        isRecurring: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        tableName: "rides",
        timestamps: false,
    }
);

export default RideModel;
