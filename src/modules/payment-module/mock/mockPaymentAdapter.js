import createLogger from "../../../utils/logger.js";

const logger = createLogger("mock-payment-adapter");

/**
 * Mock Payment Provider Adapter for Development and Testing
 * Simulates payment flow when real providers are unavailable
 */
class MockPaymentAdapter {
    constructor() {
        this.providerName = "mock";
    }

    /**
     * Process a mock payment
     * @param {Object} paymentRequest - Standardized payment request
     * @returns {Promise<Object>} Mock payment response
     */
    async processPayment(paymentRequest) {
        try {
            logger.info("Mock payment processing started", {
                bookingId: paymentRequest.bookingId,
                amount: paymentRequest.amount,
                paymentMethod: paymentRequest.paymentMethod,
            });

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Generate mock transaction ID
            const mockTransactionId =
                `MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
            const externalTransactionId = `TYVAA_${paymentRequest.bookingId}_${Date.now()}`;

            // Simulate different payment outcomes based on amount
            let status = "pending";
            let success = true;

            // For testing: amounts ending in 1 fail, ending in 2 are pending, others succeed
            const lastDigit = paymentRequest.amount % 10;
            if (lastDigit === 1) {
                status = "failed";
                success = false;
            } else if (lastDigit === 2) {
                status = "pending";
            } else {
                status = "completed";
            }

            const mockResponse = {
                success,
                provider: this.providerName,
                transactionId: mockTransactionId,
                externalTransactionId,
                amount: paymentRequest.amount,
                currency: "XOF",
                status,
                paymentMethod: paymentRequest.paymentMethod,
                phoneNumber: paymentRequest.phoneNumber,
                fee: Math.round(paymentRequest.amount * 0.02), // 2% fee
                paymentUrl: null, // Mock doesn't need payment URL
                redirectUrl: paymentRequest.returnUrl,
                metadata: {
                    serviceCode: `MOCK_${paymentRequest.country}_${paymentRequest.paymentMethod.toUpperCase()}`,
                    serviceName: `Mock ${paymentRequest.paymentMethod} Payment`,
                    apiTransactionId: mockTransactionId,
                    initiatedAt: new Date().toISOString(),
                    bookingId: paymentRequest.bookingId,
                    mockProvider: true,
                    simulatedOutcome: status,
                },
            };

            logger.info("Mock payment processed", {
                transactionId: mockTransactionId,
                status,
                amount: paymentRequest.amount,
            });

            return mockResponse;
        } catch (error) {
            logger.error("Mock payment processing failed", {
                bookingId: paymentRequest.bookingId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Check mock payment status
     * @param {string} transactionId - Mock transaction ID
     * @returns {Promise<Object>} Mock payment status
     */
    async checkPaymentStatus(transactionId) {
        logger.info("Mock payment status check", { transactionId });

        // Simulate status progression
        const status = transactionId.includes("PENDING")
            ? "completed"
            : "completed";

        return {
            transactionId,
            status,
            amount: 1000, // Mock amount
            phoneNumber: "771234567",
            serviceName: "Mock Payment Service",
            serviceCode: "MOCK_SN_CASHOUT",
            initiatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            type: "CASHOUT",
        };
    }

    /**
     * Process mock webhook (not needed for mock)
     * @param {Object} webhookData - Webhook payload
     * @returns {Promise<Object>} Processed webhook data
     */
    async processWebhook(webhookData) {
        logger.info("Mock webhook received", webhookData);
        return {
            transactionId: webhookData.transactionId || "MOCK_WEBHOOK",
            status: "completed",
            amount: webhookData.amount || 1000,
        };
    }

    /**
     * Get mock payment methods
     * @param {string} country - Country code
     * @returns {Promise<Array>} Mock payment methods
     */
    async getAvailablePaymentMethods(country = "SN") {
        return [
            {
                code: "MOCK_SN_CASHOUT",
                operator: "orange",
                displayName: "Mock Orange Money",
                country,
            },
            {
                code: "MOCK_SN_WAVE",
                operator: "wave",
                displayName: "Mock Wave",
                country,
            },
            {
                code: "MOCK_SN_FREE",
                operator: "free",
                displayName: "Mock Free Money",
                country,
            },
        ];
    }
}

export default MockPaymentAdapter;
