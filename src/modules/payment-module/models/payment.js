/**
 * @file Defines the Payment model for storing payment transaction information.
 * @typedef {Object} PaymentAttributes
 * @property {number} id - The unique identifier for the payment record.
 * @property {string} transactionId - Unique transaction identifier from payment provider.
 * @property {string} externalTransactionId - External transaction ID (our internal reference).
 * @property {number} bookingId - The ID of the booking associated with this payment.
 * @property {string} phone - Phone number associated with the payment.
 * @property {number} amount - Payment amount.
 * @property {number} fee - Payment processing fee.
 * @property {("pending"|"processing"|"completed"|"failed"|"cancelled")} status - Payment status.
 * @property {string} currency - Payment currency code (e.g., "XOF", "USD").
 * @property {string} paymentMethod - Payment method used (e.g., "orange", "wave", "mtn").
 * @property {string} provider - Payment provider (e.g., "dexchange", "cinetpay").
 * @property {string} metadata - Additional metadata as JSON string.
 * @property {string} operatorId - Payment operator identifier.
 * @property {string} paymentUrl - Payment URL for user redirection.
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
            comment: "Provider transaction ID",
        },
        externalTransactionId: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            comment: "Our internal transaction reference",
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
            comment: "Customer phone number",
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
            comment: "Payment amount",
        },
        fee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
            validate: {
                min: 0,
            },
            comment: "Payment processing fee",
        },
        status: {
            type: DataTypes.ENUM(
                "pending",
                "processing",
                "completed",
                "failed",
                "cancelled"
            ),
            allowNull: false,
            defaultValue: "pending",
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: "XOF",
            validate: {
                isUppercase: true,
                len: [3, 3],
            },
        },
        paymentMethod: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "Payment method (orange, wave, mtn, etc.)",
        },
        provider: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "dexchange",
            comment: "Payment provider (dexchange, cinetpay, etc.)",
        },
        metadata: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Additional metadata as JSON string",
        },
        operatorId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Payment operator identifier",
        },
        paymentUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Payment URL for user redirection",
        },
    },
    {
        timestamps: true,
        tableName: "Payments",
        // Remove problematic indexes that cause the error
        indexes: [],
    }
);

/**
 * Instance methods for Payment model
 */
Payment.prototype.toJSON = function () {
    const values = { ...this.dataValues };

    // Parse metadata if it's a string
    if (values.metadata && typeof values.metadata === "string") {
        try {
            values.metadata = JSON.parse(values.metadata);
        } catch (e) {
            // Keep as string if parsing fails
        }
    }

    return values;
};

/**
 * Check if payment is in a final state
 */
Payment.prototype.isFinal = function () {
    return ["completed", "failed", "cancelled"].includes(this.status);
};

/**
 * Check if payment is successful
 */
Payment.prototype.isSuccessful = function () {
    return this.status === "completed";
};

/**
 * Static methods for Payment model
 */

/**
 * Find payment by external transaction ID
 */
Payment.findByExternalId = function (externalTransactionId) {
    return this.findOne({
        where: { externalTransactionId },
    });
};

/**
 * Find payments by booking ID
 */
Payment.findByBookingId = function (bookingId) {
    return this.findAll({
        where: { bookingId },
        order: [["createdAt", "DESC"]],
    });
};

/**
 * Find payments by status
 */
Payment.findByStatus = function (status) {
    return this.findAll({
        where: { status },
        order: [["createdAt", "DESC"]],
    });
};

export default Payment;
