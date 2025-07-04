import { paymentResponseSchema } from "../validations/paymentResponse.schema.js";
import paymentService from "./../services/paymentService.js";
import createLogger from "#utils/logger.js";

const logger = createLogger("payment-controller");

/**
 * @file Handles payment-related HTTP requests and responses.
 */

const paymentController = {
    /**
     * Handles payment notification webhooks from payment providers.
     * Updates payment status based on provider response.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} res - The Fastify reply object.
     * @returns {Promise<void>} Sends appropriate HTTP response.
     */
    notify: async (req, res) => {
        const parseResult = paymentResponseSchema.safeParse(req.body);
        if (!parseResult.success) {
            logger.warn("Invalid payment webhook payload", {
                errors: parseResult.error.errors,
                body: req.body,
            });
            return res.status(400).json({
                error: "Invalid webhook payload",
                details: parseResult.error.errors,
            });
        }

        try {
            const updatedPayment = await paymentService.updateTransactionStatus(
                parseResult.data
            );

            logger.info("Payment notification processed successfully", {
                transactionId: parseResult.data.transaction_id,
                status: updatedPayment.status,
            });

            res.status(200).send("OK");
        } catch (error) {
            logger.error("Error updating transaction status", error);
            return res.status(500).send("Internal Server Error");
        }
    },
};

export default paymentController;
