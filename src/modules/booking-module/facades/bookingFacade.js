import bookingService from "../services/bookingService.js";
import User from "../../user-module/models/user.js";
import RideInstance from "../../ride-module/models/rideInstance.js";

const bookingFacade = {
    async getAllBookings() {
        return bookingService.getAllBookings();
    },
    async getBookingById(id) {
        return bookingService.getBookingById(id);
    },
    async createBooking(data) {
        return bookingService.createBooking(data);
    },
    async updateBooking(id, data) {
        return bookingService.updateBooking(id, data);
    },
    async deleteBooking(id) {
        return bookingService.deleteBooking(id);
    },
    async bookRide({ userId, rideInstanceId, seatsToBook }) {
        const user = await User.findByPk(userId);
        if (!user) throw new Error("User not found");
        const rideInstance = await RideInstance.findByPk(rideInstanceId);
        if (!rideInstance) throw new Error("RideInstance not found");
        return bookingService.bookRide({ user, rideInstance, seatsToBook });
    },
    async cancelBooking(id) {
        return bookingService.cancelBooking(id);
    },
};

export default bookingFacade;
