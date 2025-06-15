const {DataTypes} = require('sequelize');
const sequelize = require('./../../../config/db');

const RideInstance = sequelize.define('RideInstance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    rideId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'rides',
            key: 'id',
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
        type: DataTypes.ENUM('scheduled', 'cancelled', 'completed'),
        defaultValue: 'scheduled',
    },
}, {
    tableName: 'ride_instances',
    indexes: [
        {
            unique: true,
            fields: ['rideId', 'rideDate'],
        },
    ],
});

module.exports = RideInstance;
