/**
 * Payment Sequelize Model
 * @typedef {import("sequelize").Model} Payment
 * @typedef {Object} PaymentSchema
 * @property {string} transaction_id - Unique transaction identifier
 * @property {string} phone - Phone number associated with the payment
 * @property {number} amount - Payment amount
 * @property {string} status - Payment status (default: 'pending')
 * @property {string} currency - Payment currency
 * @property {string} payment_method - Payment method
 * @property {string} metadata - Additional metadata
 * @property {string} operator_id - Operator identifier
 */

import { DataTypes } from "sequelize";
import sequelize from "./../../../config/db.js";

const Payment = sequelize.define(
    "Payment",
    {
        transaction_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        phone: { type: DataTypes.STRING, allowNull: true },
        amount: { type: DataTypes.FLOAT, allowNull: false },
        status: { type: DataTypes.STRING, defaultValue: "PENDING" },
        currency: { type: DataTypes.STRING, allowNull: true },
        payment_method: { type: DataTypes.STRING, allowNull: true },
        metadata: { type: DataTypes.STRING, allowNull: true },
        operator_id: { type: DataTypes.STRING, allowNull: true },
    },
    {
        timestamps: true,
    }
);

export default Payment;
