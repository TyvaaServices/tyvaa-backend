import Payment from "../models/payment.js";
import DexchangeAdapter from "../dexchange/dexchangeAdapter.js";
import MockPaymentAdapter from "../mock/mockPaymentAdapter.js";
import createLogger from "../../../utils/logger.js";
import { AppError, NotFoundError } from "../../../utils/customErrors.js";

const logger = createLogger("payment-service");

/**
 * @file Enhanced payment service supporting multiple providers including DEXCHANGE
 * @typedef {import("../models/payment.js").PaymentAttributes} PaymentAttributes
 */

/**
 * Payment Service Class
 * Handles all payment operations across multiple providers
 */
class PaymentService {
    constructor() {
        this.providers = {
            dexchange: new DexchangeAdapter(),
            mock: new MockPaymentAdapter(),
            // Add other providers here (cinetpay, etc.)
        };

        // Determine which provider to use based on environment
        this.defaultProvider = this.getDefaultProvider();
        logger.info("Payment service initialized", {
            defaultProvider: this.defaultProvider,
            availableProviders: Object.keys(this.providers),
        });
    }

    /**
     * Determine the default payment provider based on environment and configuration
     * @returns {string} Provider name to use
     */
    getDefaultProvider() {
        const envProvider = process.env.DEFAULT_PAYMENT_PROVIDER;
        const isDevelopment =
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "developement";

        // In development, use mock provider as fallback if DEXCHANGE is not available
        if (isDevelopment && envProvider === "dexchange") {
            // Check if we should fallback to mock for development
            const useMockFallback =
                process.env.USE_MOCK_PAYMENT_FALLBACK === "true";
            if (useMockFallback) {
                logger.warn(
                    "Using mock payment provider as fallback in development"
                );
                return "mock";
            }
        }

        return envProvider || "dexchange";
    }

    /**
     * Creates a new payment record and initiates payment with the selected provider.
     * @param {Object} paymentData - The payment creation data.
     * @param {number} paymentData.bookingId - The booking ID associated with this payment.
     * @param {number} paymentData.amount - The payment amount in FCFA.
     * @param {string} paymentData.phoneNumber - The customer's phone number.
     * @param {string} [paymentData.currency="XOF"] - The payment currency.
     * @param {string} [paymentData.paymentMethod="orange"] - The payment method (orange, wave, mtn, etc.).
     * @param {string} [paymentData.provider="dexchange"] - The payment provider.
     * @param {string} [paymentData.country="SN"] - Country code for the payment.
     * @param {string} paymentData.callbackUrl - Webhook callback URL.
     * @param {string} paymentData.returnUrl - Return URL for success/failure.
     * @returns {Promise<Object>} The payment initialization result.
     */
    async createPayment(paymentData) {
        let payment = null;
        try {
            // Validate required fields
            const requiredFields = [
                "bookingId",
                "amount",
                "phoneNumber",
                "callbackUrl",
                "returnUrl",
            ];
            const missingFields = requiredFields.filter(
                (field) => !paymentData[field]
            );
            if (missingFields.length > 0) {
                throw new AppError(
                    `Missing required fields: ${missingFields.join(", ")}`,
                    400
                );
            }

            // Validate amount
            if (paymentData.amount < 200 || paymentData.amount > 1000000) {
                throw new AppError(
                    "Amount must be between 200 and 1,000,000 FCFA",
                    400
                );
            }

            // Set defaults
            const provider = paymentData.provider || "dexchange";
            const paymentMethod = paymentData.paymentMethod || "orange";
            const currency = paymentData.currency || "XOF";
            const country = paymentData.country || "SN";

            // Check if provider is supported
            if (!this.providers[provider]) {
                throw new AppError(
                    `Unsupported payment provider: ${provider}`,
                    400
                );
            }

            logger.info("Starting payment initialization", {
                bookingId: paymentData.bookingId,
                provider,
                paymentMethod,
                amount: paymentData.amount,
            });

            // Process payment with the selected provider FIRST
            const providerResult = await this.providers[
                provider
            ].processPayment({
                bookingId: paymentData.bookingId,
                amount: paymentData.amount,
                phoneNumber: paymentData.phoneNumber,
                paymentMethod,
                country,
                callbackUrl: paymentData.callbackUrl,
                returnUrl: paymentData.returnUrl,
            });

            // Validate provider result has required fields
            if (!providerResult || !providerResult.transactionId) {
                logger.error(
                    "Invalid provider response - missing transactionId",
                    {
                        provider,
                        providerResult,
                        bookingId: paymentData.bookingId,
                    }
                );

                throw new AppError(
                    `Payment provider ${provider} returned invalid response - missing transaction ID`,
                    500
                );
            }

            // Create payment record with all required data including transactionId
            payment = await Payment.create({
                bookingId: paymentData.bookingId,
                amount: paymentData.amount,
                currency,
                paymentMethod,
                provider,
                phone: paymentData.phoneNumber,
                status: providerResult.status || "pending",
                transactionId: providerResult.transactionId,
                externalTransactionId: providerResult.externalTransactionId,
                fee: providerResult.fee || 0,
                operatorId: providerResult.metadata?.apiTransactionId,
                paymentUrl: providerResult.paymentUrl,
                metadata: JSON.stringify({
                    country,
                    callbackUrl: paymentData.callbackUrl,
                    returnUrl: paymentData.returnUrl,
                    userAgent: paymentData.userAgent,
                    ipAddress: paymentData.ipAddress,
                    providerResponse: providerResult.metadata,
                }),
            });

            logger.info("Payment initialized successfully", {
                paymentId: payment.id,
                transactionId: providerResult.transactionId,
                status: providerResult.status,
            });

            return {
                payment: payment.toJSON(),
                providerResult,
                paymentUrl: providerResult.paymentUrl,
                redirectUrl: providerResult.redirectUrl,
            };
        } catch (error) {
            logger.error("Error creating payment", {
                error: error.message,
                stack: error.stack,
                bookingId: paymentData.bookingId,
            });

            // Clean up payment record if it was created but there was an error
            if (payment) {
                try {
                    await payment.destroy();
                    logger.info("Cleaned up payment record after error", {
                        paymentId: payment.id,
                    });
                } catch (cleanupError) {
                    logger.error("Failed to cleanup payment record", {
                        paymentId: payment.id,
                        error: cleanupError.message,
                    });
                }
            }

            throw error;
        }
    }

    /**
     * Updates payment status based on provider webhook or status check.
     * @param {Object} statusData - Payment status update data.
     * @param {string} statusData.transactionId - The provider transaction ID.
     * @param {string} statusData.status - The new payment status.
     * @param {Object} [statusData.metadata] - Additional status metadata.
     * @returns {Promise<PaymentAttributes>} The updated payment record.
     */
    async updatePaymentStatus(statusData) {
        try {
            const payment = await Payment.findOne({
                where: { transactionId: statusData.transactionId },
            });

            if (!payment) {
                throw new NotFoundError(
                    `Payment not found for transaction ID: ${statusData.transactionId}`
                );
            }

            // Check if payment is already in a final state
            if (payment.isFinal() && statusData.status !== payment.status) {
                logger.warn("Attempted to update payment in final state", {
                    paymentId: payment.id,
                    currentStatus: payment.status,
                    newStatus: statusData.status,
                });
                return payment;
            }

            // Update payment status
            const updateData = {
                status: statusData.status,
            };

            // Update metadata if provided
            if (statusData.metadata) {
                const existingMetadata = payment.metadata
                    ? JSON.parse(payment.metadata)
                    : {};
                updateData.metadata = JSON.stringify({
                    ...existingMetadata,
                    statusUpdate: statusData.metadata,
                    lastUpdated: new Date().toISOString(),
                });
            }

            await payment.update(updateData);

            logger.info("Payment status updated", {
                paymentId: payment.id,
                transactionId: statusData.transactionId,
                oldStatus: payment.status,
                newStatus: statusData.status,
            });

            return payment;
        } catch (error) {
            logger.error("Error updating payment status", {
                error: error.message,
                transactionId: statusData.transactionId,
            });
            throw error;
        }
    }

    /**
     * Process webhook notification from payment provider.
     * @param {string} provider - Payment provider name.
     * @param {Object} webhookData - Webhook payload.
     * @param {string} [signature] - Webhook signature for verification.
     * @returns {Promise<Object>} Processing result.
     */
    async processWebhook(provider, webhookData, signature = null) {
        try {
            if (!this.providers[provider]) {
                throw new AppError(
                    `Unsupported payment provider: ${provider}`,
                    400
                );
            }

            // Process webhook with the specific provider
            const processedData = await this.providers[provider].processWebhook(
                webhookData,
                signature
            );

            // Update payment status
            const payment = await this.updatePaymentStatus({
                transactionId: processedData.transactionId,
                status: processedData.status,
                metadata: {
                    webhookData: processedData,
                    processedAt: new Date().toISOString(),
                },
            });

            logger.info("Webhook processed successfully", {
                provider,
                transactionId: processedData.transactionId,
                status: processedData.status,
                paymentId: payment.id,
            });

            return {
                payment,
                webhookData: processedData,
                success: true,
            };
        } catch (error) {
            logger.error("Error processing webhook", {
                provider,
                error: error.message,
                webhookId: webhookData.id || webhookData.transactionId,
            });
            throw error;
        }
    }

    /**
     * Check payment status with the provider.
     * @param {string} transactionId - Provider transaction ID.
     * @param {string} [provider="dexchange"] - Payment provider.
     * @returns {Promise<Object>} Payment status information.
     */
    async checkPaymentStatus(transactionId, provider = "dexchange") {
        try {
            if (!this.providers[provider]) {
                throw new AppError(
                    `Unsupported payment provider: ${provider}`,
                    400
                );
            }

            // Get status from provider
            const providerStatus =
                await this.providers[provider].checkPaymentStatus(
                    transactionId
                );

            // Get local payment record
            const payment = await Payment.findOne({
                where: { transactionId },
            });

            if (!payment) {
                throw new NotFoundError(
                    `Payment not found for transaction ID: ${transactionId}`
                );
            }

            // Update local record if status changed
            if (payment.status !== providerStatus.status) {
                await this.updatePaymentStatus({
                    transactionId,
                    status: providerStatus.status,
                    metadata: {
                        statusCheck: providerStatus,
                        checkedAt: new Date().toISOString(),
                    },
                });
            }

            return {
                payment: payment.toJSON(),
                providerStatus,
                synchronized: payment.status === providerStatus.status,
            };
        } catch (error) {
            logger.error("Error checking payment status", {
                error: error.message,
                transactionId,
                provider,
            });
            throw error;
        }
    }

    /**
     * Get payment by ID.
     * @param {number} paymentId - Payment ID.
     * @returns {Promise<PaymentAttributes>} Payment record.
     */
    async getPaymentById(paymentId) {
        try {
            const payment = await Payment.findByPk(paymentId);
            if (!payment) {
                throw new NotFoundError(
                    `Payment not found with ID: ${paymentId}`
                );
            }
            return payment;
        } catch (error) {
            logger.error("Error fetching payment by ID", {
                error: error.message,
                paymentId,
            });
            throw error;
        }
    }

    /**
     * Get payments by booking ID.
     * @param {number} bookingId - Booking ID.
     * @returns {Promise<PaymentAttributes[]>} Payment records.
     */
    async getPaymentsByBookingId(bookingId) {
        try {
            const payments = await Payment.findByBookingId(bookingId);
            return payments;
        } catch (error) {
            logger.error("Error fetching payments by booking ID", {
                error: error.message,
                bookingId,
            });
            throw error;
        }
    }

    /**
     * Get available payment methods for a country.
     * @param {string} [country="SN"] - Country code.
     * @param {string} [provider="dexchange"] - Payment provider.
     * @returns {Promise<Array>} Available payment methods.
     */
    async getAvailablePaymentMethods(country = "SN", provider = "dexchange") {
        try {
            if (!this.providers[provider]) {
                throw new AppError(
                    `Unsupported payment provider: ${provider}`,
                    400
                );
            }

            return await this.providers[provider].getAvailablePaymentMethods(
                country
            );
        } catch (error) {
            logger.error("Error fetching payment methods", {
                error: error.message,
                country,
                provider,
            });
            throw error;
        }
    }

    /**
     * Cancel a pending payment.
     * @param {string} transactionId - Provider transaction ID.
     * @returns {Promise<PaymentAttributes>} Updated payment record.
     */
    async cancelPayment(transactionId) {
        try {
            const payment = await Payment.findOne({
                where: { transactionId },
            });

            if (!payment) {
                throw new NotFoundError(
                    `Payment not found for transaction ID: ${transactionId}`
                );
            }

            if (payment.isFinal()) {
                throw new AppError(
                    `Cannot cancel payment in ${payment.status} state`,
                    400
                );
            }

            await payment.update({
                status: "cancelled",
                metadata: JSON.stringify({
                    ...JSON.parse(payment.metadata || "{}"),
                    cancelledAt: new Date().toISOString(),
                    cancelReason: "Manual cancellation",
                }),
            });

            logger.info("Payment cancelled", {
                paymentId: payment.id,
                transactionId,
            });

            return payment;
        } catch (error) {
            logger.error("Error cancelling payment", {
                error: error.message,
                transactionId,
            });
            throw error;
        }
    }
}

// Create and export a singleton instance
const paymentService = new PaymentService();
export default paymentService;
