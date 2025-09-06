import bookingService from "../services/bookingService.js";
import { User, RideInstance } from "../../../config/index.js";
import createLogger from "../../../utils/logger.js";

const logger = createLogger("booking-facade");

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
    async bookRide({
        userId,
        rideInstanceId,
        seatsToBook,
        paymentMethod = "orange",
        country = "SN",
    }) {
        logger.debug("BookingFacade.bookRide called", {
            userId,
            rideInstanceId,
            seatsToBook,
            paymentMethod,
            country,
        });

        // Fetch user and validate
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Fetch ride instance and validate
        const rideInstance = await RideInstance.findByPk(rideInstanceId);
        if (!rideInstance) {
            throw new Error("RideInstance not found");
        }

        logger.debug("User and RideInstance found", {
            userId: user.id,
            userPhone: user.phoneNumber,
            rideInstanceId: rideInstance.id,
            availableSeats: rideInstance.seatsAvailable,
            bookedSeats: rideInstance.seatsBooked,
        });

        // Call the updated booking service with DEXCHANGE payment integration
        return bookingService.bookRide({
            user,
            rideInstance,
            seatsToBook,
            paymentMethod,
            country,
        });
    },
    async cancelBooking(id) {
        return bookingService.cancelBooking(id);
    },
};

export default bookingFacade;
