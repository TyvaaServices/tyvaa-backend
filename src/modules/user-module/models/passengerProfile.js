const {DataTypes} = require('sequelize');
const sequelize = require('./../../../config/db');


const PassengerProfile = sequelize.define("PassengerProfile", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    notePassager: {
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
module.exports = PassengerProfile;