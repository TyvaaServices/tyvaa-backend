import { DataTypes } from 'sequelize';
import sequelize from './../../../config/db.js';

const Booking = sequelize.define('Booking', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    rideInstanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ride_instances',
            key: 'id',
        },
    },
    seatsBooked: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
        },
    },
    status: {
        type: DataTypes.ENUM('booked', 'cancelled'),
        defaultValue: 'booked',
    },
}, {
    tableName: 'bookings',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'rideInstanceId'],
        },
    ],
});

export default Booking;
