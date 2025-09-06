import DexchangeService from "./dexchangeService.js";
import createLogger from "../../../utils/logger.js";

const logger = createLogger("dexchange-adapter");

/**
 * DEXCHANGE Payment Provider Adapter
 * Standardizes DEXCHANGE integration with your payment system
 */
class DexchangeAdapter {
    constructor() {
        this.dexchangeService = new DexchangeService();
        this.providerName = "dexchange";
    }

    /**
     * Process a payment through DEXCHANGE
     * @param {Object} paymentRequest - Standardized payment request
     * @param {string} paymentRequest.bookingId - Booking ID
     * @param {number} paymentRequest.amount - Amount in FCFA
     * @param {string} paymentRequest.phoneNumber - Customer phone number
     * @param {string} paymentRequest.paymentMethod - Payment method (orange, wave, mtn, etc.)
     * @param {string} paymentRequest.country - Country code (SN, ML, CI, CM)
     * @param {string} paymentRequest.callbackUrl - Webhook URL
     * @param {string} paymentRequest.returnUrl - Return URL for success/failure
     * @returns {Promise<Object>} Payment response
     */
    async processPayment(paymentRequest) {
        try {
            logger.debug("DEXCHANGE processPayment called", { paymentRequest });

            // Generate unique external transaction ID
            const externalTransactionId = this.generateTransactionId(
                paymentRequest.bookingId
            );

            // Normalize country code from full names to ISO codes
            const normalizedCountry = this.normalizeCountryCode(
                paymentRequest.country || "SN"
            );

            // Determine service code based on country and payment method
            const serviceCode = this.dexchangeService.getServiceCode(
                normalizedCountry,
                paymentRequest.paymentMethod,
                "CASHOUT" // Default to CASHOUT (customer pays)
            );

            if (!serviceCode) {
                throw new Error(
                    `Unsupported payment method: ${paymentRequest.paymentMethod} in ${paymentRequest.country} (normalized: ${normalizedCountry})`
                );
            }

            logger.debug("DEXCHANGE service code determined", {
                serviceCode,
                externalTransactionId,
                normalizedCountry,
            });

            // Prepare DEXCHANGE transaction data
            const transactionData = {
                externalTransactionId,
                serviceCode,
                amount: paymentRequest.amount,
                number: paymentRequest.phoneNumber,
                callBackURL: paymentRequest.callbackUrl,
                successUrl: `${paymentRequest.returnUrl}?status=success&booking=${paymentRequest.bookingId}`,
                failureUrl: `${paymentRequest.returnUrl}?status=failed&booking=${paymentRequest.bookingId}`,
            };

            logger.debug("DEXCHANGE transaction data prepared", {
                transactionData,
            });

            // Initialize transaction with DEXCHANGE
            const response =
                await this.dexchangeService.initializeTransaction(
                    transactionData
                );

            logger.debug("DEXCHANGE API response received", { response });

            const standardizedResponse = this.standardizeResponse(
                response,
                paymentRequest
            );

            logger.debug("DEXCHANGE response standardized", {
                standardizedResponse,
            });

            return standardizedResponse;
        } catch (error) {
            logger.error("DEXCHANGE payment processing failed", {
                bookingId: paymentRequest.bookingId,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Check payment status
     * @param {string} transactionId - DEXCHANGE transaction ID
     * @returns {Promise<Object>} Payment status
     */
    async checkPaymentStatus(transactionId) {
        try {
            const transaction =
                await this.dexchangeService.getTransactionStatus(transactionId);
            return this.standardizeStatusResponse(transaction);
        } catch (error) {
            logger.error("Failed to check DEXCHANGE payment status", {
                transactionId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Process webhook notification from DEXCHANGE
     * @param {Object} webhookData - Webhook payload
     * @param {string} signature - Webhook signature for verification
     * @returns {Promise<Object>} Processed webhook data
     */
    async processWebhook(webhookData, signature = null) {
        try {
            // Verify webhook signature if provided
            if (signature) {
                const isValid = this.dexchangeService.verifyWebhookSignature(
                    JSON.stringify(webhookData),
                    signature
                );
                if (!isValid) {
                    throw new Error("Invalid webhook signature");
                }
            }

            return this.standardizeWebhookData(webhookData);
        } catch (error) {
            logger.error("Failed to process DEXCHANGE webhook", {
                error: error.message,
                webhookId: webhookData.id,
            });
            throw error;
        }
    }

    /**
     * Get available payment methods for a country
     * @param {string} country - Country code
     * @returns {Promise<Array>} Available payment methods
     */
    async getAvailablePaymentMethods(country = "SN") {
        try {
            const services = await this.dexchangeService.getServices();
            return this.filterServicesByCountry(services, country);
        } catch (error) {
            logger.error("Failed to get available payment methods", error);
            return this.getDefaultPaymentMethods(country);
        }
    }

    /**
     * Generate unique transaction ID
     * @param {string} bookingId - Booking ID
     * @returns {string} Unique transaction ID
     */
    generateTransactionId(bookingId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `TYVAA_${bookingId}_${timestamp}_${random}`.toUpperCase();
    }

    /**
     * Standardize DEXCHANGE response to match your payment system format
     * @param {Object} dexchangeResponse - Raw DEXCHANGE response
     * @param {Object} originalRequest - Original payment request
     * @returns {Object} Standardized response
     */
    standardizeResponse(dexchangeResponse, originalRequest) {
        logger.debug("DEXCHANGE raw response:", {
            response: dexchangeResponse,
            originalRequest,
        });

        // Validate DEXCHANGE response structure
        if (!dexchangeResponse) {
            logger.error("Invalid DEXCHANGE response structure", {
                response: dexchangeResponse,
                originalRequest,
            });
            throw new Error(
                "Invalid response from DEXCHANGE API - no response data"
            );
        }

        // Handle case where transaction data might be at root level or nested
        const transaction = dexchangeResponse.transaction || dexchangeResponse;

        // Extract transaction ID from multiple possible fields
        const transactionId =
            transaction.transactionId ||
            transaction.id ||
            transaction.transaction_id ||
            transaction.ApiTransactionId ||
            transaction.api_transaction_id;

        // Extract external transaction ID from multiple possible fields
        const externalTransactionId =
            transaction.externalTransactionId ||
            transaction.external_transaction_id ||
            transaction.externalId ||
            originalRequest.bookingId;

        // Log warning if transaction ID is missing but don't fail
        if (!transactionId) {
            logger.warn("DEXCHANGE transaction missing transactionId", {
                transaction,
                originalRequest,
                availableFields: Object.keys(transaction || {}),
            });
        }

        // Log warning if external transaction ID is missing but don't fail
        if (!externalTransactionId) {
            logger.warn("DEXCHANGE transaction missing externalTransactionId", {
                transaction,
                originalRequest,
                availableFields: Object.keys(transaction || {}),
            });
        }

        return {
            success: dexchangeResponse.success !== false, // Default to true unless explicitly false
            provider: this.providerName,
            transactionId:
                transactionId ||
                `TEMP_${Date.now()}_${originalRequest.bookingId}`,
            externalTransactionId:
                externalTransactionId || originalRequest.bookingId,
            amount:
                transaction.transactionAmount ||
                transaction.amount ||
                transaction.Amount ||
                originalRequest.amount,
            currency: "XOF",
            status: this.mapDexchangeStatus(
                transaction.Status ||
                    transaction.status ||
                    transaction.STATE ||
                    "pending"
            ),
            paymentMethod: originalRequest.paymentMethod,
            phoneNumber:
                transaction.number ||
                transaction.phoneNumber ||
                transaction.Number ||
                originalRequest.phoneNumber,
            fee:
                transaction.transactionFee ||
                transaction.fee ||
                transaction.Fee ||
                0,
            paymentUrl:
                transaction.cashout_url ||
                transaction.paymentUrl ||
                transaction.payment_url ||
                null,
            redirectUrl:
                transaction.successUrl ||
                transaction.success_url ||
                originalRequest.returnUrl,
            metadata: {
                serviceCode:
                    transaction.serviceCode || transaction.service_code,
                serviceName:
                    transaction.serviceName || transaction.service_name,
                apiTransactionId:
                    transaction.ApiTransactionId ||
                    transaction.api_transaction_id,
                initiatedAt:
                    transaction.INITIATED_AT ||
                    transaction.initiated_at ||
                    new Date().toISOString(),
                bookingId: originalRequest.bookingId,
                rawResponse: transaction, // Store raw response for debugging
            },
        };
    }

    /**
     * Standardize status response
     * @param {Object} transaction - DEXCHANGE transaction data
     * @returns {Object} Standardized status
     */
    standardizeStatusResponse(transaction) {
        return {
            transactionId: transaction.OperatorApi || transaction.transactionId,
            status: this.mapDexchangeStatus(transaction.Status),
            amount: transaction.Amount,
            phoneNumber: transaction.Number,
            serviceName: transaction.ServiceName,
            serviceCode: transaction.ServiceCode,
            initiatedAt: transaction.Initiated_at,
            completedAt: transaction.Completed_at,
            type: transaction.Type,
        };
    }

    /**
     * Standardize webhook data
     * @param {Object} webhookData - Raw webhook data
     * @returns {Object} Standardized webhook data
     */
    standardizeWebhookData(webhookData) {
        return {
            transactionId: webhookData.id,
            externalTransactionId: webhookData.externalTransactionId,
            status: this.mapDexchangeStatus(webhookData.STATUS),
            amount: webhookData.AMOUNT,
            fee: webhookData.FEE,
            phoneNumber: webhookData.PHONE_NUMBER,
            transactionType: webhookData.transactionType,
            completedAt: webhookData.COMPLETED_AT,
            balance: webhookData.BALANCE,
            previousBalance: webhookData.PREVIOUS_BALANCE,
            currentBalance: webhookData.CURRENT_BALANCE,
            customData: webhookData.CUSTOM_DATA
                ? JSON.parse(webhookData.CUSTOM_DATA)
                : {},
        };
    }

    /**
     * Map DEXCHANGE status to standardized status
     * @param {string} dexchangeStatus - DEXCHANGE status
     * @returns {string} Standardized status
     */
    mapDexchangeStatus(dexchangeStatus) {
        const statusMap = {
            PENDING: "pending",
            PROCESSING: "processing",
            SUCCESS: "completed",
            FAILED: "failed",
            CANCELLED: "cancelled",
        };

        return statusMap[dexchangeStatus?.toUpperCase()] || "unknown";
    }

    /**
     * Filter services by country
     * @param {Array} services - All available services
     * @param {string} country - Country code
     * @returns {Array} Filtered services
     */
    filterServicesByCountry(services, country) {
        return services
            .filter(
                (service) =>
                    service.country === country &&
                    service.serviceCode.includes("CASHOUT")
            )
            .map((service) => ({
                code: service.serviceCode,
                name: service.serviceName,
                type: service.serviceType,
                country: service.country,
                operator: this.extractOperatorFromServiceCode(
                    service.serviceCode
                ),
                displayName: this.getDisplayName(service.serviceCode),
            }));
    }

    /**
     * Extract operator from service code
     * @param {string} serviceCode - Service code
     * @returns {string} Operator name
     */
    extractOperatorFromServiceCode(serviceCode) {
        if (serviceCode.startsWith("OM_")) return "orange";
        if (serviceCode.startsWith("WAVE_")) return "wave";
        if (serviceCode.startsWith("MTN_")) return "mtn";
        if (serviceCode.startsWith("MOOV_")) return "moov";
        if (serviceCode.startsWith("FM_")) return "free";
        if (serviceCode.startsWith("WIZALL_")) return "wizall";
        return "unknown";
    }

    /**
     * Get display name for payment method
     * @param {string} serviceCode - Service code
     * @returns {string} Display name
     */
    getDisplayName(serviceCode) {
        const displayNames = {
            OM_: "Orange Money",
            WAVE_: "Wave",
            MTN_: "MTN Money",
            MOOV_: "Moov Money",
            FM_: "Free Money",
            WIZALL_: "Wizall Money",
        };

        for (const [prefix, name] of Object.entries(displayNames)) {
            if (serviceCode.startsWith(prefix)) {
                return name;
            }
        }
        return "Mobile Money";
    }

    /**
     * Get default payment methods for country (fallback)
     * @param {string} country - Country code
     * @returns {Array} Default payment methods
     */
    getDefaultPaymentMethods(country) {
        const defaults = {
            SN: [
                {
                    code: "OM_SN_CASHOUT",
                    operator: "orange",
                    displayName: "Orange Money",
                },
                {
                    code: "WAVE_SN_CASHOUT",
                    operator: "wave",
                    displayName: "Wave",
                },
                {
                    code: "FM_SN_CASHOUT",
                    operator: "free",
                    displayName: "Free Money",
                },
                {
                    code: "WIZALL_SN_CASHOUT",
                    operator: "wizall",
                    displayName: "Wizall Money",
                },
            ],
            ML: [
                {
                    code: "OM_ML_CASHOUT",
                    operator: "orange",
                    displayName: "Orange Money",
                },
                {
                    code: "MOOV_ML_CASHOUT",
                    operator: "moov",
                    displayName: "Moov Money",
                },
                {
                    code: "WAVE_ML_CASHOUT",
                    operator: "wave",
                    displayName: "Wave",
                },
            ],
            CI: [
                {
                    code: "OM_CI_CASHOUT",
                    operator: "orange",
                    displayName: "Orange Money",
                },
                {
                    code: "WAVE_CI_CASHOUT",
                    operator: "wave",
                    displayName: "Wave",
                },
                {
                    code: "MTN_CI_CASHOUT",
                    operator: "mtn",
                    displayName: "MTN Money",
                },
                {
                    code: "MOOV_CI_CASHOUT",
                    operator: "moov",
                    displayName: "Moov Money",
                },
            ],
            CM: [
                {
                    code: "OM_CM_CASHOUT",
                    operator: "orange",
                    displayName: "Orange Money",
                },
                {
                    code: "MTN_CM_CASHOUT",
                    operator: "mtn",
                    displayName: "MTN Money",
                },
            ],
        };

        return defaults[country] || defaults["SN"];
    }

    /**
     * Normalize country codes from full names to ISO codes
     * @param {string} country - Country name or code
     * @returns {string} ISO country code
     */
    normalizeCountryCode(country) {
        const countryMap = {
            // Full country names to ISO codes
            SENEGAL: "SN",
            MALI: "ML",
            "IVORY COAST": "CI",
            "COTE D'IVOIRE": "CI",
            CAMEROON: "CM",
            "BURKINA FASO": "BF",
            NIGER: "NE",
            GUINEA: "GN",
            TOGO: "TG",
            BENIN: "BJ",
            // Already correct ISO codes
            SN: "SN",
            ML: "ML",
            CI: "CI",
            CM: "CM",
            BF: "BF",
            NE: "NE",
            GN: "GN",
            TG: "TG",
            BJ: "BJ",
        };

        const normalized = countryMap[country?.toUpperCase()];
        if (!normalized) {
            logger.warn("Unknown country code, defaulting to Senegal", {
                originalCountry: country,
            });
            return "SN"; // Default to Senegal
        }

        return normalized;
    }
}

export default DexchangeAdapter;
