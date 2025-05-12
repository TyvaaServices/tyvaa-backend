const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            is: /^\+?[1-9]\d{1,14}$/, // E.164 format
        }
    },
    isDriver: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    driverLicence: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    carImage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

module.exports = User;
