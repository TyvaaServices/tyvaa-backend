// src/modules/booking-module/facades/bookingFacade.js
import bookingService from '../services/bookingService.js';
import { User, RideInstance } from '../../../config/index.js'; // Adjust path as necessary if config is elsewhere or models are directly imported

const bookingFacade = {
    async getAllBookings() {
        return bookingService.getAllBookings();
    },

    async getBookingById(bookingId) {
        const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            // Facades can choose to throw custom errors or return null/undefined
            // For consistency with how controllers might expect data or handle errors:
            return null;
        }
        return booking;
    },

    async createBooking(bookingData) {
        // Add any validation or transformation logic here if needed before calling service
        return bookingService.createBooking(bookingData);
    },

    async updateBooking(bookingId, bookingData) {
        const booking = await bookingService.updateBooking(bookingId, bookingData);
        if (!booking) {
            return null;
        }
        return booking;
    },

    async deleteBooking(bookingId) {
        // bookingService.deleteBooking is expected to return a boolean or similar indicator
        return bookingService.deleteBooking(bookingId);
    },

    async bookRide({ userId, rideInstanceId, seatsToBook }) {
        const user = await User.findByPk(userId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404; // Or a custom error code/type
            throw error;
        }

        const rideInstance = await RideInstance.findByPk(rideInstanceId);
        if (!rideInstance) {
            const error = new Error('RideInstance not found');
            error.statusCode = 404;
            throw error;
        }

        // The service might have more complex logic, e.g., checking available seats,
        // handling transactions, creating the booking record.
        return bookingService.bookRide({ user, rideInstance, seatsToBook });
    },

    async cancelBooking(bookingId) {
        const booking = await bookingService.cancelBooking(bookingId);
         if (!booking) {
            // This implies booking was not found or couldn't be cancelled (e.g., already cancelled)
            return null;
        }
        return booking; // Return the updated/cancelled booking
    }
};

export default bookingFacade;
