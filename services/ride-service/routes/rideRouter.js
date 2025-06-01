const rideController = require('../controllers/rideController');

async function rideRoutes(fastify, opts) {
    fastify.get('/health', rideController.healthCheck);
    fastify.get('/rides', rideController.getAllRides);
    fastify.get('/rides/:id', rideController.getRideById);
    fastify.post('/rides', rideController.createRide);
    fastify.put('/rides/:id', rideController.updateRide);
    fastify.delete('/rides/:id', rideController.deleteRide);
    fastify.post('/rides/:id/accept', rideController.acceptRide);
    fastify.post('/rides/:id/reject', rideController.rejectRide);
    fastify.post('/rides/:id/complete', rideController.completeRide);
    fastify.post('/rides/:id/rate', rideController.rateRide);
    fastify.post('/rides/:id/report', rideController.reportRide);
    fastify.post('/rides/:id/notify', rideController.notifyRide);

    // RideInstance CRUD
    fastify.get('/ride-instances', rideController.getAllRideInstances);
    fastify.get('/ride-instances/:id', rideController.getRideInstanceById);
    fastify.post('/ride-instances', rideController.createRideInstance);
    fastify.put('/ride-instances/:id', rideController.updateRideInstance);
    fastify.delete('/ride-instances/:id', rideController.deleteRideInstance);

    // Booking CRUD
    fastify.get('/bookings', rideController.getAllBookings);
    fastify.get('/bookings/:id', rideController.getBookingById);
    fastify.post('/bookings', rideController.createBooking);
    fastify.put('/bookings/:id', rideController.updateBooking);
    fastify.delete('/bookings/:id', rideController.deleteBooking);

    // Booking actions
    fastify.post('/bookings/book', rideController.bookRide);
    fastify.post('/bookings/:bookingId/cancel', rideController.cancelBooking);
}

module.exports = rideRoutes;
