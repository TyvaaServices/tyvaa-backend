const {DataTypes} = require('sequelize');
const sequelize = require('./../config/db');

const ride = sequelize.define('Ride', {
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
    dateTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    places: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
        },
    },
    recurrence: {
        type: DataTypes.ARRAY(DataTypes.STRING), // Example: ['Mon', 'Tue', 'Thu']
        allowNull: true, // Only for recurring trips
    },
    rideStyle: {
        type: DataTypes.ENUM('quiet', 'chill', 'music'),
        defaultValue: 'chill',
    },
    comment: {
        type: DataTypes.TEXT,
        defaultValue: '',
    },
    price: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('active', 'cancelled', 'completed'),
        defaultValue: 'active',
    },
});
module.exports = ride;