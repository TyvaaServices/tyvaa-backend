const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db'); // assumes you have a sequelize instance in db.js

const Payment = sequelize.define('Payment', {
    phone: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
}, {
    timestamps: true
});

module.exports = Payment;