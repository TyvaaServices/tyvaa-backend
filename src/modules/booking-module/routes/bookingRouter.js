import bookingController from "../controllers/bookingController.js";

async function rideRoutes(fastify, _opts) {
    fastify.get("/bookings", bookingController.getAllBookings);
    fastify.get("/bookings/:id", bookingController.getBookingById);
    fastify.put("/bookings/:id", bookingController.updateBooking);
    fastify.delete("/bookings/:id", bookingController.deleteBooking);

    fastify.post("/bookings/book", {
        preValidation: [fastify.authenticate]
    }, bookingController.bookRide);
    fastify.post(
        "/bookings/:bookingId/cancel",
        {
            preValidation: [fastify.authenticate]
        },
        bookingController.cancelBooking
    );
}

export default rideRoutes;
