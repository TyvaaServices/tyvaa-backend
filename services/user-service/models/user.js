const {DataTypes} = require('sequelize');
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
            },
        },
    "nomComplet":{
      type: DataTypes.STRING,
        allowNull: true,
    },
        fcmToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        driverLicense: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    isOnline: {
            type:DataTypes.BOOLEAN,
            defaultValue: false,
    },
        carImage: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isDriver: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isBlocked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        latitude: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        longitude: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },

)

module.exports = User;

