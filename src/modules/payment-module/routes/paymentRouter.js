import paymentController from "../controllers/paymentController.js";
import dexchangeRoutes from "../dexchange/routes/dexchangeRoutes.js";

async function paymentRoutes(fastify, _opts) {
    // Existing payment routes
    fastify.post("/notify", paymentController.notify);

    // DEXCHANGE payment routes
    fastify.register(dexchangeRoutes, { prefix: "/dexchange" });

    // General payment endpoints
    fastify.get(
        "/methods/:country?",
        {
            schema: {
                tags: ["Payments"],
                summary: "Get available payment methods for a country",
                params: {
                    type: "object",
                    properties: {
                        country: {
                            type: "string",
                            description:
                                "Country code (SN, ML, CI, CM) or country name",
                            default: "SN",
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                let { country = "SN" } = request.params;
                const { provider = "dexchange" } = request.query;

                // Map country names to country codes
                const countryMapping = {
                    SENEGAL: "SN",
                    SENEGAL: "SN",
                    MALI: "ML",
                    IVORY_COAST: "CI",
                    COTE_DIVOIRE: "CI",
                    CAMEROON: "CM",
                    CAMEROUN: "CM",
                };

                // Convert country name to code if needed
                const upperCountry = country.toUpperCase();
                if (countryMapping[upperCountry]) {
                    country = countryMapping[upperCountry];
                }

                // Validate final country code
                if (!/^[A-Z]{2}$/.test(country)) {
                    return reply.code(400).send({
                        success: false,
                        message: "Invalid country code. Use: SN, ML, CI, CM",
                        validCodes: ["SN", "ML", "CI", "CM"],
                    });
                }

                const paymentService = (
                    await import("../services/paymentService.js")
                ).default;
                const methods = await paymentService.getAvailablePaymentMethods(
                    country,
                    provider
                );

                return reply.code(200).send({
                    success: true,
                    country,
                    provider,
                    methods,
                });
            } catch (error) {
                return reply.code(500).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    fastify.post(
        "/initialize",
        {
            schema: {
                tags: ["Payments"],
                summary: "Initialize a payment transaction",
                body: {
                    type: "object",
                    required: [
                        "bookingId",
                        "amount",
                        "phoneNumber",
                        "callbackUrl",
                        "returnUrl",
                    ],
                    properties: {
                        bookingId: {
                            type: "number",
                            description: "Booking ID",
                        },
                        amount: {
                            type: "number",
                            minimum: 200,
                            maximum: 1000000,
                            description: "Amount in FCFA",
                        },
                        phoneNumber: {
                            type: "string",
                            description: "Customer phone number",
                        },
                        paymentMethod: {
                            type: "string",
                            default: "orange",
                            description: "Payment method",
                        },
                        provider: {
                            type: "string",
                            default: "dexchange",
                            description: "Payment provider",
                        },
                        country: {
                            type: "string",
                            default: "SN",
                            description: "Country code",
                        },
                        callbackUrl: {
                            type: "string",
                            format: "uri",
                            description: "Webhook URL",
                        },
                        returnUrl: {
                            type: "string",
                            format: "uri",
                            description: "Return URL",
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const paymentService = (
                    await import("../services/paymentService.js")
                ).default;
                const result = await paymentService.createPayment(request.body);

                return reply.code(201).send({
                    success: true,
                    message: "Payment initialized successfully",
                    data: result,
                });
            } catch (error) {
                return reply.code(400).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    fastify.get(
        "/status/:transactionId",
        {
            schema: {
                tags: ["Payments"],
                summary: "Check payment status",
                params: {
                    type: "object",
                    required: ["transactionId"],
                    properties: {
                        transactionId: {
                            type: "string",
                            description: "Transaction ID",
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { transactionId } = request.params;
                const { provider = "dexchange" } = request.query;

                const paymentService = (
                    await import("../services/paymentService.js")
                ).default;
                const result = await paymentService.checkPaymentStatus(
                    transactionId,
                    provider
                );

                return reply.code(200).send({
                    success: true,
                    data: result,
                });
            } catch (error) {
                const statusCode = error.message.includes("not found")
                    ? 404
                    : 500;
                return reply.code(statusCode).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    fastify.get(
        "/booking/:bookingId",
        {
            schema: {
                tags: ["Payments"],
                summary: "Get payments for a booking",
                params: {
                    type: "object",
                    required: ["bookingId"],
                    properties: {
                        bookingId: {
                            type: "number",
                            description: "Booking ID",
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { bookingId } = request.params;

                const paymentService = (
                    await import("../services/paymentService.js")
                ).default;
                const payments = await paymentService.getPaymentsByBookingId(
                    parseInt(bookingId)
                );

                return reply.code(200).send({
                    success: true,
                    data: payments,
                });
            } catch (error) {
                return reply.code(500).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );
}

export default paymentRoutes;
