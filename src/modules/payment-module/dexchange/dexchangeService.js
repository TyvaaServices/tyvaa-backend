import axios from "axios";
import createLogger from "../../../utils/logger.js";

const logger = createLogger("dexchange-service");

/**
 * DEXCHANGE Payment Service for West African Mobile Money Integration
 * Supports Orange Money, Wave, MTN Money, Moov Money across Senegal, Mali, Ivory Coast, Cameroon
 */
class DexchangeService {
    constructor() {
        this.baseURL =
            process.env.DEXCHANGE_BASE_URL ||
            "https://api-m.dexchange.sn/api/v1";
        this.apiKey = process.env.DEXCHANGE_API_KEY;
        this.webhookSecret = process.env.DEXCHANGE_WEBHOOK_SECRET;

        if (!this.apiKey) {
            throw new Error("DEXCHANGE_API_KEY is required");
        }

        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: 30000,
        });

        // Add request/response interceptors for logging
        this.axiosInstance.interceptors.request.use((config) => {
            logger.debug("DEXCHANGE API Request", {
                method: config.method,
                url: config.url,
                data: config.data
                    ? { ...config.data, number: "***MASKED***" }
                    : undefined,
            });
            return config;
        });

        this.axiosInstance.interceptors.response.use(
            (response) => {
                logger.debug("DEXCHANGE API Response", {
                    status: response.status,
                    url: response.config.url,
                });
                return response;
            },
            (error) => {
                logger.error("DEXCHANGE API Error", {
                    status: error.response?.status,
                    message: error.response?.data?.message || error.message,
                    url: error.config?.url,
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get list of available payment services
     * @returns {Promise<Array>} List of available services
     */
    async getServices() {
        try {
            const response = await this.axiosInstance.get(
                "/api-services/services"
            );
            return response.data.services;
        } catch (error) {
            logger.error("Failed to fetch DEXCHANGE services", error);
            throw new Error("Unable to fetch payment services");
        }
    }

    /**
     * Get account balance
     * @returns {Promise<Object>} Account balance information
     */
    async getBalance() {
        try {
            const response = await this.axiosInstance.get(
                "/api-services/balance"
            );
            return response.data.balance;
        } catch (error) {
            logger.error("Failed to fetch DEXCHANGE balance", error);
            throw new Error("Unable to fetch account balance");
        }
    }

    /**
     * Initialize a payment transaction
     * @param {Object} paymentData - Payment initialization data
     * @param {string} paymentData.externalTransactionId - Your unique transaction ID
     * @param {string} paymentData.serviceCode - Payment service code (e.g., OM_SN_CASHOUT)
     * @param {number} paymentData.amount - Amount in FCFA (200-1,000,000)
     * @param {string} paymentData.number - Phone number (9 digits, no country code)
     * @param {string} paymentData.callBackURL - Webhook notification URL
     * @param {string} paymentData.successUrl - Success redirect URL
     * @param {string} paymentData.failureUrl - Failure redirect URL
     * @returns {Promise<Object>} Transaction initialization response
     */
    async initializeTransaction(paymentData) {
        try {
            // Validate required fields
            this.validateTransactionData(paymentData);

            const payload = {
                externalTransactionId: paymentData.externalTransactionId,
                serviceCode: paymentData.serviceCode,
                amount: paymentData.amount,
                number: this.normalizePhoneNumber(paymentData.number),
                callBackURL: paymentData.callBackURL,
                successUrl: paymentData.successUrl,
                failureUrl: paymentData.failureUrl,
            };

            const response = await this.axiosInstance.post(
                "/transaction/init",
                payload
            );

            logger.info("DEXCHANGE transaction initialized", {
                transactionId: response.data.transaction?.transactionId,
                externalId: paymentData.externalTransactionId,
                amount: paymentData.amount,
                serviceCode: paymentData.serviceCode,
            });

            return response.data;
        } catch (error) {
            logger.error("Failed to initialize DEXCHANGE transaction", {
                error: error.response?.data || error.message,
                externalId: paymentData.externalTransactionId,
            });
            throw this.handleApiError(error);
        }
    }

    /**
     * Get transaction status
     * @param {string} transactionId - DEXCHANGE transaction ID
     * @returns {Promise<Object>} Transaction details
     */
    async getTransactionStatus(transactionId) {
        try {
            const response = await this.axiosInstance.get(
                `/transaction/${transactionId}`
            );
            return response.data.transaction;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error("Transaction not found");
            }
            logger.error("Failed to fetch transaction status", {
                transactionId,
                error: error.response?.data || error.message,
            });
            throw new Error("Unable to fetch transaction status");
        }
    }

    /**
     * Validate transaction data before sending to DEXCHANGE
     * @param {Object} data - Transaction data to validate
     */
    validateTransactionData(data) {
        const requiredFields = [
            "externalTransactionId",
            "serviceCode",
            "amount",
            "number",
            "callBackURL",
            "successUrl",
            "failureUrl",
        ];

        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate amount range
        if (data.amount < 200 || data.amount > 1000000) {
            throw new Error("Amount must be between 200 and 1,000,000 FCFA");
        }

        // Validate phone number format
        const phoneRegex = /^[0-9]{9}$/;
        const normalizedPhone = this.normalizePhoneNumber(data.number);
        if (!phoneRegex.test(normalizedPhone)) {
            throw new Error(
                "Phone number must be 9 digits without country code"
            );
        }

        // Validate URLs
        const urlFields = ["callBackURL", "successUrl", "failureUrl"];
        for (const field of urlFields) {
            try {
                new URL(data[field]);
            } catch {
                throw new Error(`Invalid URL format for ${field}`);
            }
        }
    }

    /**
     * Normalize phone number to DEXCHANGE format (9 digits, no country code)
     * @param {string} phone - Phone number to normalize
     * @returns {string} Normalized phone number
     */
    normalizePhoneNumber(phone) {
        // Remove all non-digit characters
        let normalized = phone.replace(/\D/g, "");

        // Handle Senegal numbers (+221)
        if (normalized.startsWith("221") && normalized.length === 12) {
            normalized = normalized.substring(3);
        }
        // Handle other West African country codes
        else if (normalized.startsWith("223") && normalized.length === 11) {
            // Mali
            normalized = normalized.substring(3);
        } else if (normalized.startsWith("225") && normalized.length === 12) {
            // Ivory Coast
            normalized = normalized.substring(3);
        } else if (normalized.startsWith("237") && normalized.length === 12) {
            // Cameroon
            normalized = normalized.substring(3);
        }
        // If already 9 digits, keep as is
        else if (normalized.length === 9) {
            // Keep as is
        }
        // If 10 digits starting with 7, 3, or 0, remove first digit (common in West Africa)
        else if (normalized.length === 10 && /^[730]/.test(normalized)) {
            normalized = normalized.substring(1);
        }

        return normalized;
    }

    /**
     * Get appropriate service code based on country and payment method
     * @param {string} country - Country code (SN, ML, CI, CM)
     * @param {string} operator - Mobile operator (orange, wave, mtn, moov, etc.)
     * @param {string} type - Transaction type (CASHIN, CASHOUT)
     * @returns {string} Service code for DEXCHANGE
     */
    getServiceCode(country, operator, type = "CASHOUT") {
        const serviceMap = {
            SN: {
                orange: `OM_SN_${type}`,
                wave: `WAVE_SN_${type}`,
                free: `FM_SN_${type}`,
                wizall: `WIZALL_SN_${type}`,
            },
            ML: {
                orange: `OM_ML_${type}`,
                moov: `MOOV_ML_${type}`,
                wave: `WAVE_ML_${type}`,
            },
            CI: {
                orange: `OM_CI_${type}`,
                wave: `WAVE_CI_${type}`,
                mtn: `MTN_CI_${type}`,
                moov: `MOOV_CI_${type}`,
            },
            CM: {
                orange: `OM_CM_${type}`,
                mtn: `MTN_CM_${type}`,
            },
        };

        return serviceMap[country]?.[operator.toLowerCase()] || null;
    }

    /**
     * Verify webhook signature for security
     * @param {string} payload - Raw webhook payload
     * @param {string} signature - Webhook signature header
     * @returns {boolean} Whether signature is valid
     */
    verifyWebhookSignature(payload, signature) {
        if (!this.webhookSecret || !signature) {
            return false;
        }

        const crypto = require("crypto");
        const expectedSignature = crypto
            .createHmac("sha256", this.webhookSecret)
            .update(payload)
            .digest("hex");

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Handle API errors and convert to user-friendly messages
     * @param {Error} error - API error
     * @returns {Error} Formatted error
     */
    handleApiError(error) {
        const response = error.response;

        if (!response) {
            return new Error(
                "Network error: Unable to connect to payment service"
            );
        }

        // Log detailed error information for debugging
        logger.error("DEXCHANGE API detailed error", {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers,
            config: {
                url: response.config?.url,
                method: response.config?.method,
                headers: response.config?.headers,
            },
        });

        switch (response.status) {
            case 400:
                const errorMessage =
                    response.data?.message ||
                    response.data?.error ||
                    "Invalid payment parameters";
                if (typeof errorMessage === "string") {
                    return new Error(errorMessage);
                } else if (Array.isArray(errorMessage)) {
                    return new Error(
                        errorMessage[0] || "Invalid payment parameters"
                    );
                } else {
                    return new Error("Invalid payment parameters");
                }
            case 401:
                return new Error(
                    "Payment service authentication failed - API key invalid"
                );
            case 403:
                const forbiddenMsg =
                    response.data?.message || response.data?.error;
                if (
                    forbiddenMsg &&
                    forbiddenMsg.includes("Company not found")
                ) {
                    return new Error(
                        "DEXCHANGE merchant account not verified. Please contact DEXCHANGE support to verify your merchant account."
                    );
                }
                return new Error(
                    "Payment service access denied - merchant account may need verification"
                );
            case 409:
                return new Error("Transaction ID already exists");
            case 422:
                return new Error("Invalid transaction data provided");
            default:
                const defaultMsg =
                    response.data?.message ||
                    response.data?.error ||
                    "Payment service error. Please try again.";
                return new Error(defaultMsg);
        }
    }
}

export default DexchangeService;
