import bookingFacade from "../facades/bookingFacade.js";

const bookingController = {
    getAllBookings: async (req, reply) => {
        const bookings = await bookingFacade.getAllBookings();
        return reply.send(bookings);
    },
    getBookingById: async (req, reply) => {
        const booking = await bookingFacade.getBookingById(req.params.id);
        if (!booking)
            return reply.code(404).send({ error: "Booking not found" });
        return reply.send(booking);
    },
    createBooking: async (req, reply) => {
        try {
            const booking = await bookingFacade.createBooking(req.body);
            return reply.code(201).send(booking);
        } catch (err) {
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
    updateBooking: async (req, reply) => {
        try {
            const booking = await bookingFacade.updateBooking(
                req.params.id,
                req.body
            );
            if (!booking)
                return reply.code(404).send({ error: "Booking not found" });
            return reply.send(booking);
        } catch (err) {
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
    deleteBooking: async (req, reply) => {
        const deleted = await bookingFacade.deleteBooking(req.params.id);
        if (!deleted)
            return reply
                .code(404)
                .send({ error: "Booking not found or could not be deleted" });
        return reply.code(204).send();
    },
    bookRide: async (req, reply) => {
        try {
            const { userId, rideInstanceId, seatsToBook } = req.body;
            const booking = await bookingFacade.bookRide({
                userId,
                rideInstanceId,
                seatsToBook,
            });
            return reply.code(201).send(booking);
        } catch (err) {
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
    cancelBooking: async (req, reply) => {
        try {
            const booking = await bookingFacade.cancelBooking(
                req.params.bookingId
            );
            if (!booking)
                return reply
                    .code(404)
                    .send({ error: "Booking not found or already cancelled" });
            return reply.send({
                message: "Booking cancelled successfully.",
                booking,
            });
        } catch (err) {
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
};

export default bookingController;
