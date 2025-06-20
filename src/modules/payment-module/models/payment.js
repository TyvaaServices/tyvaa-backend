import { DataTypes } from 'sequelize';
import sequelize from './../../../config/db.js';

const Payment = sequelize.define('Payment', {
    phone: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
}, {
    timestamps: true
});

export default Payment;
