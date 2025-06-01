const {DataTypes} = require('sequelize');
const sequelize = require('./../config/db');

const RideRating = sequelize.define('RideRating', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    rideInstanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ride_instances',
            key: 'id',
        },
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5,
        },
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    indexes: [
        {
            unique: true,
            fields: ['userId', 'rideInstanceId'],
        },
    ],
});

module.exports = RideRating;

