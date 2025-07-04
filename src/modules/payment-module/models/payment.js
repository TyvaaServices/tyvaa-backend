/**
 * @file Defines the Payment model for storing payment transaction information.
 * @typedef {Object} PaymentAttributes
 * @property {number} id - The unique identifier for the payment record.
 * @property {string} transactionId - Unique transaction identifier from payment provider.
 * @property {number} bookingId - The ID of the booking associated with this payment. Foreign key to bookings.
 * @property {string} phone - Phone number associated with the payment.
 * @property {number} amount - Payment amount in the smallest currency unit.
 * @property {("PENDING"|"COMPLETED"|"FAILED"|"CANCELLED")} status - Payment status.
 * @property {string} currency - Payment currency code (e.g., "XOF", "USD").
 * @property {string} paymentMethod - Payment method used (e.g., "cinetpay", "orange_money").
 * @property {string} metadata - Additional metadata as JSON string.
 * @property {string} operatorId - Payment operator identifier.
 * @property {Date} createdAt - Timestamp when the payment was created.
 * @property {Date} updatedAt - Timestamp when the payment was last updated.
 */

import { DataTypes } from "sequelize";
import sequelize from "./../../../config/db.js";

/**
 * Sequelize model for Payment.
 * Represents a payment transaction associated with a booking.
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<PaymentAttributes, any> & PaymentAttributes>}
 */
const Payment = sequelize.define(
    "Payment",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        transactionId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            field: "transaction_id",
        },
        bookingId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "bookings",
                key: "id",
            },
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        status: {
            type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED", "CANCELLED"),
            defaultValue: "PENDING",
        },
        currency: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "XOF",
        },
        paymentMethod: {
            type: DataTypes.STRING,
            allowNull: true,
            field: "payment_method",
        },
        metadata: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        operatorId: {
            type: DataTypes.STRING,
            allowNull: true,
            field: "operator_id",
        },
    },
    {
        tableName: "payments",
        timestamps: true,
    }
);

export default Payment;
