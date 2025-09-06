import { Booking, RideInstance, RideModel } from "./../../../config/index.js";
import paymentService from "../../payment-module/services/paymentService.js";
import createLogger from "./../../../utils/logger.js";

const logger = createLogger("booking-service");

/**
 * @file Manages booking-related operations such as creating, retrieving, and canceling bookings.
 * @typedef {import("../models/booking.js").BookingAttributes} BookingAttributes
 * @typedef {import("../../user-module/models/user.js").UserAttributes} UserAttributes
 * @typedef {import("../../ride-module/models/rideInstance.js").RideInstanceAttributes} RideInstanceAttributes
 */

const bookingService = {
    /**
     * Retrieves all bookings.
     * @returns {Promise<BookingAttributes[]>} A list of all bookings.
     */
    getAllBookings: async () => Booking.findAll(),

    /**
     * Retrieves a booking by its ID.
     * @param {number} id - The ID of the booking to retrieve.
     * @returns {Promise<BookingAttributes|null>} The booking object or null if not found.
     */
    getBookingById: async (id) => Booking.findByPk(id),

    /**
     * Updates a booking's details.
     * @param {number} id - The ID of the booking to update.
     * @param {Partial<BookingAttributes>} data - The new data for the booking.
     * @returns {Promise<BookingAttributes|null>} The updated booking object or null if not found.
     */
    updateBooking: async (id, data) => {
        const booking = await Booking.findByPk(id);
        if (!booking) return null;
        await booking.update(data);
        logger.info("Booking updated", booking.id);
        return booking;
    },

    deleteBooking: async (id) => {
        const booking = await Booking.findByPk(id);
        if (!booking) return null;
        await booking.destroy();
        logger.info("Booking deleted", booking.id);
        return true;
    },

    /**
     * Creates a new booking for a ride instance with integrated DEXCHANGE payment.
     * @param {object} params - The booking parameters.
     * @param {UserAttributes} params.user - The user making the booking.
     * @param {RideInstanceAttributes} params.rideInstance - The ride instance being booked.
     * @param {number} params.seatsToBook - The number of seats to book.
     * @param {string} [params.paymentMethod="orange"] - Payment method (orange, wave, mtn, etc.).
     * @param {string} [params.country="SN"] - Country code for payment.
     * @returns {Promise<BookingAttributes & {payment: PaymentAttributes}>} The newly created booking with payment.
     * @throws {Error} If user or ride instance is not provided, or if there are not enough seats.
     */
    bookRide: async ({
        user,
        rideInstance,
        seatsToBook,
        paymentMethod = "orange",
        country = "SN",
    }) => {
        logger.debug("BookingService.bookRide called", {
            userId: user?.id,
            rideInstanceId: rideInstance?.id,
            seatsToBook,
            paymentMethod,
            country,
        });

        // Validation
        if (!user) throw new Error("User instance required");
        if (!rideInstance) throw new Error("RideInstance required");
        if (!user.phoneNumber)
            throw new Error("User phone number required for payment");

        // Check available seats
        const availableSeats =
            rideInstance.seatsAvailable - rideInstance.seatsBooked;
        if (seatsToBook > availableSeats) {
            throw new Error("Not enough seats available");
        }

        // Check for existing booking
        const existing = await Booking.findOne({
            where: { rideInstanceId: rideInstance.id, userId: user.id },
        });
        if (existing) throw new Error("Already booked");

        // Get ride model for pricing
        const rideModel = await RideModel.findByPk(rideInstance.rideId);
        if (!rideModel) throw new Error("Ride template not found");

        // Calculate total amount
        const totalAmount = rideModel.price * seatsToBook;

        // Validate amount for DEXCHANGE (200-1,000,000 FCFA)
        if (totalAmount < 200 || totalAmount > 1000000) {
            throw new Error(
                `Payment amount (${totalAmount} FCFA) must be between 200 and 1,000,000 FCFA for mobile money payment`
            );
        }

        // Create booking
        let booking;
        try {
            booking = await Booking.create({
                userId: user.id,
                rideInstanceId: rideInstance.id,
                seatsBooked: seatsToBook,
                status: "booked",
            });
            logger.info("Booking created", { bookingId: booking.id });
        } catch (createError) {
            logger.error("Booking creation failed", createError);
            throw new Error(`Booking creation failed: ${createError.message}`);
        }

        // Update ride instance seats
        await rideInstance.increment("seatsBooked", { by: seatsToBook });

        // Initialize DEXCHANGE payment
        let paymentResult = null;
        try {
            // Construct proper webhook URLs for DEXCHANGE
            const webhookBaseUrl =
                process.env.WEBHOOK_BASE_URL ||
                process.env.APP_BASE_URL ||
                "https://api.tyvaa.com"; // Replace with your actual domain

            const callbackUrl = `${webhookBaseUrl}/api/v1/payments/dexchange/webhook`;

            // DEXCHANGE requires HTTP/HTTPS URLs, not app deep links
            const returnBaseUrl =
                process.env.PAYMENT_RETURN_BASE_URL || webhookBaseUrl;
            const returnUrl = `${returnBaseUrl}/payment/success?booking=${booking.id}`;

            logger.debug("Payment URLs constructed", {
                callbackUrl,
                returnUrl,
                webhookBaseUrl,
                returnBaseUrl,
            });

            const paymentData = {
                bookingId: booking.id,
                amount: totalAmount,
                phoneNumber: user.phoneNumber,
                paymentMethod: paymentMethod,
                provider: "mock", // Use mock provider while DEXCHANGE account is being verified
                country: country,
                currency: "XOF",
                callbackUrl,
                returnUrl,
                userAgent: "Tyvaa-Mobile-App",
                ipAddress: "0.0.0.0",
            };

            paymentResult = await paymentService.createPayment(paymentData);
            logger.info("DEXCHANGE payment initialized", {
                bookingId: booking.id,
                transactionId: paymentResult.providerResult?.transactionId,
                status: paymentResult.providerResult?.status,
            });
        } catch (paymentError) {
            logger.error(
                "DEXCHANGE payment initialization failed",
                paymentError
            );

            // Rollback booking and seat increment on payment failure
            try {
                await rideInstance.decrement("seatsBooked", {
                    by: seatsToBook,
                });
                await booking.destroy();
                logger.info(
                    "Booking and seats rolled back due to payment failure"
                );
            } catch (rollbackError) {
                logger.error("Rollback failed", rollbackError);
            }

            throw new Error(
                `Payment initialization failed: ${paymentError.message}`
            );
        }

        logger.info("Ride booked successfully with DEXCHANGE mobile payment", {
            bookingId: booking.id,
            amount: totalAmount,
            paymentMethod: paymentMethod,
            transactionId: paymentResult.providerResult?.transactionId,
        });

        // Prepare mobile-optimized response
        const bookingWithPayment = booking.toJSON();
        bookingWithPayment.rideInstance = rideInstance.toJSON();

        if (paymentResult) {
            bookingWithPayment.payment = paymentResult.payment;
            bookingWithPayment.transactionId =
                paymentResult.providerResult?.transactionId;
            bookingWithPayment.paymentStatus =
                paymentResult.providerResult?.status;

            // Mobile-specific: Include payment instructions for user
            bookingWithPayment.paymentInstructions = {
                message: `Votre paiement de ${totalAmount} FCFA est en cours d'initialisation via ${paymentMethod.toUpperCase()}. Vous recevrez un code USSD sur votre téléphone ${user.phoneNumber}.`,
                amount: totalAmount,
                phoneNumber: user.phoneNumber,
                paymentMethod: paymentMethod.toUpperCase(),
                transactionId: paymentResult.providerResult?.transactionId,
                nextSteps: [
                    "Attendez le code USSD sur votre téléphone",
                    "Composez le code reçu pour confirmer le paiement",
                    "Le statut de votre réservation sera mis à jour automatiquement",
                ],
            };
        }

        return bookingWithPayment;
    },

    /**
     * Cancels a booking.
     * @param {number} bookingId - The ID of the booking to cancel.
     * @returns {Promise<boolean|null>} True if the booking was cancelled, null if not found or already cancelled.
     */
    cancelBooking: async (bookingId) => {
        const booking = await Booking.findByPk(bookingId, {
            include: [RideInstance],
        });
        if (!booking || booking.status === "cancelled") return null;

        const rideInstance = booking.RideInstance;
        await booking.update({ status: "cancelled" });

        if (rideInstance) {
            await rideInstance.decrement("seatsBooked", {
                by: booking.seatsBooked,
            });
        }

        logger.info("Booking cancelled", booking.id);
        return true;
    },
};

export default bookingService;
