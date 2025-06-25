import bookingService from "../services/bookingService.js";
import { User, RideInstance } from "../../../config/index.js";
const bookingFacade = {
    async getAllBookings() {
        return bookingService.getAllBookings();
    },

    async getBookingById(bookingId) {
        const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            return null;
        }
        return booking;
    },

    async createBooking(bookingData) {
        return bookingService.bookRide(bookingData);
    },

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

    async deleteBooking(bookingId) {
        return bookingService.deleteBooking(bookingId);
    },

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

    async cancelBooking(bookingId) {
        const booking = await bookingService.cancelBooking(bookingId);
        if (!booking) {
            return null;
        }
        return booking;
    },
};

export default bookingFacade;
