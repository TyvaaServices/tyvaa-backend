const {DataTypes} = require('sequelize');
const sequelize = require('./../config/db');

const RideParticipant = sequelize.define('RideParticipant', {
    rideId: {
        type: DataTypes.INTEGER,
        allowNull: false,

    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
        defaultValue: 'pending',
    },
});
module.exports = RideParticipant;