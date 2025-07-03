const paymentService = {
    /**
     * Update the status of a payment transaction.
     * @param {import("../models/payment.js").PaymentSchema} paymentData - Payment data containing transaction_id and new status.
     * @returns {Promise<import("../models/payment.js").Payment>} The updated payment instance.
     */
    updateTransactionStatus: async (paymentData) => {
        try {
            const Payment = await import("../models/payment.js").then(
                (m) => m.default
            );
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
            if (
                paymentData.status !== "SUCCESS" &&
                paymentData.status !== "FAILED"
            ) {
                throw new Error("Invalid status provided");
            }
            payment.status = paymentData.status;
            payment.amount = paymentData.amount;
            payment.currency = paymentData.currency;
            payment.payment_method = paymentData.payment_method;
            payment.metadata = JSON.stringify(paymentData.metadata);
            payment.operator_id = paymentData.operator_id;
            await payment.save();
            return payment;
        } catch (error) {
            console.error("Error updating transaction status:", error);
            throw error;
        }
    },
    createPayment: async (paymentData) => {
        try {
            const Payment = await import("../models/payment.js").then(
                (m) => m.default
            );
            const payment = await Payment.create(paymentData);
            return payment;
        } catch (error) {
            console.error("Error creating payment:", error);
            throw error;
        }
    },
};
export default paymentService;
