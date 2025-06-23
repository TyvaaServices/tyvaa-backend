import bookingFacade from '../facades/bookingFacade.js';
// Models User and RideInstance are no longer directly used by controller

const bookingController = {
    getAllBookings: async (req, reply) => {
        // Consider adding try-catch for unexpected facade errors
        const bookings = await bookingFacade.getAllBookings();
        return reply.send(bookings);
    },
    getBookingById: async (req, reply) => {
        const booking = await bookingFacade.getBookingById(req.params.id);
        if (!booking) return reply.code(404).send({ error: 'Booking not found' });
        return reply.send(booking);
    },
    createBooking: async (req, reply) => {
        try {
            const booking = await bookingFacade.createBooking(req.body);
            return reply.code(201).send(booking);
        } catch (err) {
            // Facade might throw errors with statusCodes, or generic errors
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
    updateBooking: async (req, reply) => {
        try {
            const booking = await bookingFacade.updateBooking(req.params.id, req.body);
            if (!booking) return reply.code(404).send({ error: 'Booking not found' });
            return reply.send(booking);
        } catch (err) {
            const statusCode = err.statusCode || 400; // Assuming facade might set statusCode
            return reply.code(statusCode).send({ error: err.message });
        }
    },
    deleteBooking: async (req, reply) => {
        const deleted = await bookingFacade.deleteBooking(req.params.id);
        if (!deleted) return reply.code(404).send({ error: 'Booking not found or could not be deleted' });
        // Standard practice is to return 204 No Content on successful deletion
        return reply.code(204).send();
    },
    bookRide: async (req, reply) => {
        try {
            // userId would typically come from authenticated request.user.id
            // For now, assuming it's in body as per original controller
            const { userId, rideInstanceId, seatsToBook } = req.body;
            const booking = await bookingFacade.bookRide({ userId, rideInstanceId, seatsToBook });
            return reply.code(201).send(booking);
        } catch (err) {
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
    cancelBooking: async (req, reply) => {
        try {
            const booking = await bookingFacade.cancelBooking(req.params.bookingId);
            if (!booking) return reply.code(404).send({ error: 'Booking not found or already cancelled' });
            return reply.send({ message: 'Booking cancelled successfully.', booking }); // Success message
        } catch (err) {
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
};

export default bookingController;
