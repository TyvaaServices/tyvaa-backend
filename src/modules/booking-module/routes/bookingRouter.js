const bookingController = require('../controllers/bookingController');

async function rideRoutes(fastify, opts) {

    fastify.get('/bookings', bookingController.getAllBookings);
    fastify.get('/bookings/:id', bookingController.getBookingById);
    fastify.post('/bookings', bookingController.createBooking);
    fastify.put('/bookings/:id', bookingController.updateBooking);
    fastify.delete('/bookings/:id', bookingController.deleteBooking);

    fastify.post('/bookings/book', bookingController.bookRide);
    fastify.post('/bookings/:bookingId/cancel', bookingController.cancelBooking);
}

module.exports = rideRoutes;
