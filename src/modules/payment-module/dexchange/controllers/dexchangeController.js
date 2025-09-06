import DexchangeAdapter from "./../dexchangeAdapter.js";
import createLogger from "#utils/logger.js";

const logger = createLogger("dexchange-controller");

/**
 * DEXCHANGE Payment Controller
 * Handles HTTP endpoints for DEXCHANGE payment operations
 */
class DexchangeController {
    constructor() {
        this.dexchangeAdapter = new DexchangeAdapter();
    }

    /**
     * Get available payment methods for a country
     * GET /api/v1/payments/dexchange/methods/:country?
     */
    getPaymentMethods = async (request, reply) => {
        try {
            const { country = "SN" } = request.params;

            const methods =
                await this.dexchangeAdapter.getAvailablePaymentMethods(country);

            return reply.code(200).send({
                success: true,
                country,
                paymentMethods: methods,
                provider: "dexchange",
            });
        } catch (error) {
            logger.error("Failed to get payment methods", {
                error: error.message,
                country: request.params.country,
            });

            return reply.code(500).send({
                success: false,
                message: "Unable to fetch payment methods",
                error: error.message,
            });
        }
    };

    /**
     * Initialize a DEXCHANGE payment
     * POST /api/v1/payments/dexchange/initialize
     */
    initializePayment = async (request, reply) => {
        try {
            const {
                bookingId,
                amount,
                phoneNumber,
                paymentMethod,
                country = "SN",
                callbackUrl,
                returnUrl,
            } = request.body;

            // Validate required fields
            const requiredFields = {
                bookingId,
                amount,
                phoneNumber,
                paymentMethod,
                callbackUrl,
                returnUrl,
            };
            const missingFields = Object.entries(requiredFields)
                .filter(([_, value]) => !value)
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return reply.code(400).send({
                    success: false,
                    message: "Missing required fields",
                    missingFields,
                });
            }

            // Validate amount
            if (amount < 200 || amount > 1000000) {
                return reply.code(400).send({
                    success: false,
                    message: "Amount must be between 200 and 1,000,000 FCFA",
                });
            }

            const paymentRequest = {
                bookingId,
                amount,
                phoneNumber,
                paymentMethod,
                country,
                callbackUrl,
                returnUrl,
            };

            const result =
                await this.dexchangeAdapter.processPayment(paymentRequest);

            logger.info("DEXCHANGE payment initialized", {
                bookingId,
                transactionId: result.transactionId,
                amount,
                paymentMethod,
            });

            return reply.code(201).send({
                success: true,
                message: "Payment initialized successfully",
                data: result,
            });
        } catch (error) {
            logger.error("Failed to initialize DEXCHANGE payment", {
                error: error.message,
                bookingId: request.body?.bookingId,
            });

            return reply.code(400).send({
                success: false,
                message: error.message || "Failed to initialize payment",
            });
        }
    };

    /**
     * Check payment status
     * GET /api/v1/payments/dexchange/status/:transactionId
     */
    checkPaymentStatus = async (request, reply) => {
        try {
            const { transactionId } = request.params;

            if (!transactionId) {
                return reply.code(400).send({
                    success: false,
                    message: "Transaction ID is required",
                });
            }

            const status =
                await this.dexchangeAdapter.checkPaymentStatus(transactionId);

            return reply.code(200).send({
                success: true,
                data: status,
            });
        } catch (error) {
            logger.error("Failed to check payment status", {
                error: error.message,
                transactionId: request.params.transactionId,
            });

            const statusCode =
                error.message === "Transaction not found" ? 404 : 500;

            return reply.code(statusCode).send({
                success: false,
                message: error.message || "Failed to check payment status",
            });
        }
    };

    /**
     * Handle DEXCHANGE webhook notifications
     * POST /api/v1/payments/dexchange/webhook
     */
    handleWebhook = async (request, reply) => {
        try {
            const webhookData = request.body;
            const signature =
                request.headers["x-dexchange-signature"] ||
                request.headers["x-signature"] ||
                request.headers["signature"];

            logger.info("Received DEXCHANGE webhook", {
                transactionId: webhookData.id,
                status: webhookData.STATUS,
                amount: webhookData.AMOUNT,
            });

            const processedData = await this.dexchangeAdapter.processWebhook(
                webhookData,
                signature
            );

            // Emit event for other services to handle
            if (request.server.eventBus) {
                request.server.eventBus.emit(
                    "payment.webhook.dexchange",
                    processedData
                );
            }

            return reply.code(200).send({
                success: true,
                message: "Webhook processed successfully",
            });
        } catch (error) {
            logger.error("Failed to process DEXCHANGE webhook", {
                error: error.message,
                webhookId: request.body?.id,
            });

            return reply.code(400).send({
                success: false,
                message: error.message || "Failed to process webhook",
            });
        }
    };

    /**
     * Get account balance
     * GET /api/v1/payments/dexchange/balance
     */
    getBalance = async (request, reply) => {
        try {
            const balance =
                await this.dexchangeAdapter.dexchangeService.getBalance();

            return reply.code(200).send({
                success: true,
                data: balance,
            });
        } catch (error) {
            logger.error("Failed to get DEXCHANGE balance", {
                error: error.message,
            });

            return reply.code(500).send({
                success: false,
                message: "Unable to fetch account balance",
            });
        }
    };

    /**
     * Get all available services
     * GET /api/v1/payments/dexchange/services
     */
    getServices = async (request, reply) => {
        try {
            const services =
                await this.dexchangeAdapter.dexchangeService.getServices();

            return reply.code(200).send({
                success: true,
                data: services,
            });
        } catch (error) {
            logger.error("Failed to get DEXCHANGE services", {
                error: error.message,
            });

            return reply.code(500).send({
                success: false,
                message: "Unable to fetch services",
            });
        }
    };
}

export default DexchangeController;
