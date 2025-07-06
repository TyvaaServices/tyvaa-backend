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
     * Creates a new booking for a ride instance with integrated payment creation.
     * @param {object} params - The booking parameters.
     * @param {UserAttributes} params.user - The user making the booking.
     * @param {RideInstanceAttributes} params.rideInstance - The ride instance being booked.
     * @param {number} params.seatsToBook - The number of seats to book.
     * @returns {Promise<BookingAttributes & {payment: PaymentAttributes}>} The newly created booking with payment.
     * @throws {Error} If user or ride instance is not provided, or if there are not enough seats.
     */
    bookRide: async ({ user, rideInstance, seatsToBook }) => {
        if (!user) throw new Error("User instance required");
        if (!rideInstance) throw new Error("RideInstance required");

        const availableSeats =
            rideInstance.seatsAvailable - rideInstance.seatsBooked;
        if (seatsToBook > availableSeats)
            throw new Error("Not enough seats available");

        const existing = await Booking.findOne({
            where: { rideInstanceId: rideInstance.id, userId: user.id },
        });
        if (existing) throw new Error("Already booked");

        const rideModel = await RideModel.findByPk(rideInstance.rideId);
        if (!rideModel) throw new Error("Ride template not found");

        const totalAmount = rideModel.price * seatsToBook;

        const booking = await Booking.create({
            seatsBooked: seatsToBook,
            status: "booked",
        });

        await booking.setUser(user);
        await booking.setRideInstance(rideInstance);

        const payment = await paymentService.createPayment({
            bookingId: booking.id,
            amount: totalAmount,
            currency: "XOF",
            phone: user.phone,
            paymentMethod: "cinetpay",
        });
        booking.setPayment(payment);

        await rideInstance.increment("seatsBooked", { by: seatsToBook });

        logger.info("Ride booked with payment", {
            bookingId: booking.id,
            transactionId: payment.transactionId,
            amount: totalAmount,
        });

        const bookingWithPayment = booking.toJSON();
        bookingWithPayment.payment = payment.toJSON();
        bookingWithPayment.rideInstance = rideInstance.toJSON();

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
