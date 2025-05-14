const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ride = sequelize.define('Ride', {
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
    comment: {
        type: DataTypes.TEXT,
        defaultValue: '',
    },
    price: {
        type: DataTypes.STRING,
        allowNull: false,
    }
});
module.exports = ride;