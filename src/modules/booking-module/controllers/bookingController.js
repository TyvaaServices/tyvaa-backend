const bookingService = require('../services/bookingService');
const { User,RideInstance } = require('./../../../config/index');

module.exports = {
    getAllBookings: async (req, reply) => {
        const bookings = await bookingService.getAllBookings();
        return reply.send(bookings);
    },
    getBookingById: async (req, reply) => {
        const booking = await bookingService.getBookingById(req.params.id);
        if (!booking) return reply.code(404).send({error: 'Booking not found'});
        return reply.send(booking);
    },
    createBooking: async (req, reply) => {
        try {
            const booking = await bookingService.createBooking(req.body);
            return reply.code(201).send(booking);
        } catch (err) {
            return reply.code(400).send({error: err.message});
        }
    },
    updateBooking: async (req, reply) => {
        const booking = await bookingService.updateBooking(req.params.id, req.body);
        if (!booking) return reply.code(404).send({error: 'Booking not found'});
        return reply.send(booking);
    },
    deleteBooking: async (req, reply) => {
        const deleted = await bookingService.deleteBooking(req.params.id);
        if (!deleted) return reply.code(404).send({error: 'Booking not found'});
        return reply.send({message: 'Booking deleted'});
    },
    bookRide: async (req, reply) => {
        try {
            const { userId, rideInstanceId, seatsToBook } = req.body;
            const user = await User.findByPk(userId);
            if (!user) return reply.code(404).send({ error: 'User not found' });
            const rideInstance = await RideInstance.findByPk(rideInstanceId);
            if (!rideInstance) return reply.code(404).send({ error: 'RideInstance not found' });
            const booking = await bookingService.bookRide({ user, rideInstance, seatsToBook });
            return reply.code(201).send(booking);
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    },
    cancelBooking: async (req, reply) => {
        const cancelled = await bookingService.cancelBooking(req.params.bookingId);
        if (!cancelled) return reply.code(404).send({error: 'Booking not found or already cancelled'});
        return reply.send({message: 'Booking cancelled'});
    },
};
