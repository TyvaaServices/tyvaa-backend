import Payment from "../models/payment.js";
import createLogger from "../../../utils/logger.js";

const logger = createLogger("payment-service");

/**
 * @file Manages payment-related operations for booking transactions.
 * @typedef {import('../models/payment.js').PaymentAttributes} PaymentAttributes
 */

const paymentService = {
    /**
     * Creates a new payment record for a booking.
     * @param {Object} paymentData - The payment creation data.
     * @param {number} paymentData.bookingId - The booking ID associated with this payment.
     * @param {number} paymentData.amount - The payment amount.
     * @param {string} [paymentData.currency="XOF"] - The payment currency.
     * @param {string} [paymentData.phone] - The phone number for mobile payments.
     * @param {string} [paymentData.paymentMethod="cinetpay"] - The payment method.
     * @returns {Promise<PaymentAttributes>} The created payment record.
     */
    createPayment: async (paymentData) => {
        try {
            const payment = await Payment.create(paymentData);

            logger.info("Payment created", {
                transactionId: payment.transactionId,
                bookingId: paymentData.bookingId,
            });
            return payment;
        } catch (error) {
            logger.error("Error creating payment", error);
            throw error;
        }
    },

    /**
     * Updates the status of a payment transaction based on payment provider response.
     * @param {Object} paymentData - Payment response data from provider.
     * @param {string} paymentData.transaction_id - The transaction ID to update.
     * @param {string} paymentData.status - The new payment status.
     * @param {number} paymentData.amount - The payment amount.
     * @param {string} paymentData.currency - The payment currency.
     * @param {string} paymentData.payment_method - The payment method used.
     * @param {string} paymentData.metadata - Additional payment metadata.
     * @param {string} paymentData.operator_id - The payment operator ID.
     * @returns {Promise<PaymentAttributes>} The updated payment record.
     * @throws {Error} If payment not found or already processed.
     */
    updateTransactionStatus: async (paymentData) => {
        try {
            const payment = await Payment.findOne({
                where: { transaction_id: paymentData.transaction_id },
            });

            if (!payment) {
                throw new Error("Payment not found");
            }

            if (payment.status === "SUCCESS") {
                throw new Error("Payment already processed as SUCCESS");
            }

            if (payment.status === "FAILED") {
                throw new Error("Payment already processed as FAILED");
            }

            const validStatuses = ["SUCCESS", "FAILED", "PENDING", "CANCELLED"];
            if (!validStatuses.includes(paymentData.status)) {
                throw new Error("Invalid status provided");
            }

            payment.status = paymentData.status;
            payment.amount = paymentData.amount;
            payment.currency = paymentData.currency;
            payment.paymentMethod = paymentData.payment_method;
            payment.metadata = JSON.stringify(paymentData.metadata || {});
            payment.operatorId = paymentData.operator_id;

            await payment.save();

            logger.info("Payment status updated", {
                transactionId: paymentData.transaction_id,
                status: paymentData.status,
            });

            return payment;
        } catch (error) {
            logger.error("Error updating transaction status", error);
            throw error;
        }
    },

    /**
     * Retrieves a payment by transaction ID.
     * @param {string} transactionId - The transaction ID to search for.
     * @returns {Promise<PaymentAttributes|null>} The payment record or null if not found.
     */
    getPaymentByTransactionId: async (transactionId) => {
        try {
            const payment = await Payment.findOne({
                where: { transactionId },
            });
            return payment;
        } catch (error) {
            logger.error("Error retrieving payment", error);
            throw error;
        }
    },

    /**
     * Retrieves a payment by booking ID.
     * @param {number} bookingId - The booking ID to search for.
     * @returns {Promise<PaymentAttributes|null>} The payment record or null if not found.
     */
    getPaymentByBookingId: async (bookingId) => {
        try {
            const payment = await Payment.findOne({
                where: { bookingId },
            });
            return payment;
        } catch (error) {
            logger.error("Error retrieving payment by booking ID", error);
            throw error;
        }
    },
};

export default paymentService;
