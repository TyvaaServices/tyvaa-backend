import bookingService from "../services/bookingService.js";
import { RideInstance, User } from "../../../config/index.js";

/**
 * @file Acts as a simplified interface to the booking services, hiding complex logic.
 * @typedef {import('../models/booking.js').BookingAttributes} BookingAttributes
 */

const bookingFacade = {
    /**
     * Retrieves all bookings.
     * @returns {Promise<BookingAttributes[]>} A list of all bookings.
     */
    async getAllBookings() {
        return bookingService.getAllBookings();
    },

    /**
     * Retrieves a booking by its ID.
     * @param {number} bookingId - The ID of the booking.
     * @returns {Promise<BookingAttributes|null>} The booking object or null if not found.
     */
    async getBookingById(bookingId) {
        const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            return null;
        }
        return booking;
    },

    /**
     * Creates a new booking.
     * @param {Partial<BookingAttributes>} bookingData - The data for the new booking.
     * @returns {Promise<BookingAttributes>} The created booking.
     */
    async createBooking(bookingData) {
        return bookingService.bookRide(bookingData);
    },

    /**
     * Updates an existing booking.
     * @param {number} bookingId - The ID of the booking to update.
     * @param {Partial<BookingAttributes>} bookingData - The new data for the booking.
     * @returns {Promise<BookingAttributes|null>} The updated booking or null if not found.
     */
    async updateBooking(bookingId, bookingData) {
        const booking = await bookingService.updateBooking(
            bookingId,
            bookingData
        );
        if (!booking) {
            return null;
        }
        return booking;
    },

    /**
     * Deletes a booking.
     * @param {number} bookingId - The ID of the booking to delete.
     * @returns {Promise<boolean>} A boolean indicating whether the deletion was successful.
     */
    async deleteBooking(bookingId) {
        return bookingService.deleteBooking(bookingId);
    },

    /**
     * Books a ride for a user.
     * @param {object} params - The booking parameters.
     * @param {number} params.userId - The ID of the user booking the ride.
     * @param {number} params.rideInstanceId - The ID of the ride instance to book.
     * @param {number} params.seatsToBook - The number of seats to book.
     * @returns {Promise<BookingAttributes>} The created booking.
     * @throws {Error} If the user or ride instance is not found.
     */
    async bookRide({ userId, rideInstanceId, seatsToBook }) {
        const user = await User.findByPk(userId);
        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404;
            throw error;
        }

        const rideInstance = await RideInstance.findByPk(rideInstanceId);
        if (!rideInstance) {
            const error = new Error("RideInstance not found");
            error.statusCode = 404;
            throw error;
        }

        return bookingService.bookRide({ user, rideInstance, seatsToBook });
    },

    /**
     * Cancels a booking.
     * @param {number} bookingId - The ID of the booking to cancel.
     * @returns {Promise<BookingAttributes|null>} The canceled booking or null if not found.
     */
    async cancelBooking(bookingId) {
        const booking = await bookingService.cancelBooking(bookingId);
        if (!booking) {
            return null;
        }
        return booking;
    },
};

export default bookingFacade;
