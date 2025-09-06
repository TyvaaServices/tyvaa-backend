import DexchangeController from "../controllers/dexchangeController.js";

const dexchangeController = new DexchangeController();

/**
 * DEXCHANGE Payment Routes
 * @param {FastifyInstance} fastify
 */
async function dexchangeRoutes(fastify) {
    // Get available payment methods for a country
    fastify.get(
        "/methods/:country?",
        {
            schema: {
                tags: ["DEXCHANGE Payments"],
                summary: "Get available payment methods",
                params: {
                    type: "object",
                    properties: {
                        country: {
                            type: "string",
                            pattern: "^[A-Z]{2}$",
                            description: "Country code (SN, ML, CI, CM)",
                            default: "SN",
                        },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            country: { type: "string" },
                            paymentMethods: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        code: { type: "string" },
                                        operator: { type: "string" },
                                        displayName: { type: "string" },
                                        country: { type: "string" },
                                    },
                                },
                            },
                            provider: { type: "string" },
                        },
                    },
                },
            },
        },
        dexchangeController.getPaymentMethods
    );

    // Initialize payment
    fastify.post(
        "/initialize",
        {
            schema: {
                tags: ["DEXCHANGE Payments"],
                summary: "Initialize a DEXCHANGE payment",
                body: {
                    type: "object",
                    required: [
                        "bookingId",
                        "amount",
                        "phoneNumber",
                        "paymentMethod",
                        "callbackUrl",
                        "returnUrl",
                    ],
                    properties: {
                        bookingId: {
                            type: "string",
                            description: "Booking ID",
                        },
                        amount: {
                            type: "number",
                            minimum: 200,
                            maximum: 1000000,
                            description: "Amount in FCFA (200-1,000,000)",
                        },
                        phoneNumber: {
                            type: "string",
                            pattern: "^[0-9+\\-\\s]{8,15}$",
                            description: "Customer phone number",
                        },
                        paymentMethod: {
                            type: "string",
                            enum: [
                                "orange",
                                "wave",
                                "mtn",
                                "moov",
                                "free",
                                "wizall",
                            ],
                            description: "Payment method",
                        },
                        country: {
                            type: "string",
                            pattern: "^[A-Z]{2}$",
                            default: "SN",
                            description: "Country code",
                        },
                        callbackUrl: {
                            type: "string",
                            format: "uri",
                            description: "Webhook callback URL",
                        },
                        returnUrl: {
                            type: "string",
                            format: "uri",
                            description: "Return URL for success/failure",
                        },
                    },
                },
                response: {
                    201: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    transactionId: { type: "string" },
                                    externalTransactionId: { type: "string" },
                                    amount: { type: "number" },
                                    status: { type: "string" },
                                    paymentUrl: { type: "string" },
                                    redirectUrl: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        dexchangeController.initializePayment
    );

    // Check payment status
    fastify.get(
        "/status/:transactionId",
        {
            schema: {
                tags: ["DEXCHANGE Payments"],
                summary: "Check payment status",
                params: {
                    type: "object",
                    required: ["transactionId"],
                    properties: {
                        transactionId: {
                            type: "string",
                            description: "DEXCHANGE transaction ID",
                        },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    transactionId: { type: "string" },
                                    status: { type: "string" },
                                    amount: { type: "number" },
                                    phoneNumber: { type: "string" },
                                    initiatedAt: { type: "string" },
                                    completedAt: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        dexchangeController.checkPaymentStatus
    );

    // Webhook endpoint
    fastify.post(
        "/webhook",
        {
            schema: {
                tags: ["DEXCHANGE Payments"],
                summary: "Handle DEXCHANGE webhook notifications",
                body: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        externalTransactionId: { type: "string" },
                        STATUS: { type: "string" },
                        AMOUNT: { type: "number" },
                        FEE: { type: "number" },
                        PHONE_NUMBER: { type: "string" },
                        COMPLETED_AT: { type: "string" },
                        BALANCE: { type: "number" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        dexchangeController.handleWebhook
    );

    // Get account balance
    fastify.get(
        "/balance",
        {
            schema: {
                tags: ["DEXCHANGE Payments"],
                summary: "Get DEXCHANGE account balance",
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    balance: { type: "number" },
                                    currency: { type: "string" },
                                    lastUpdate: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        dexchangeController.getBalance
    );

    // Get all services
    fastify.get(
        "/services",
        {
            schema: {
                tags: ["DEXCHANGE Payments"],
                summary: "Get all available DEXCHANGE services",
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        serviceName: { type: "string" },
                                        serviceCode: { type: "string" },
                                        serviceType: { type: "string" },
                                        country: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        dexchangeController.getServices
    );
}

export default dexchangeRoutes;
