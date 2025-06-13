const {DataTypes} = require('sequelize');
const sequelize = require('./../../../config/db');

const RideModel = sequelize.define('RideModel', {
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
        defaultValue: '',
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('active', 'cancelled', 'completed'),
        defaultValue: 'active',
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
}, {
    tableName: 'rides',
    timestamps: false,
});

module.exports = RideModel;

