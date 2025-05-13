
const rideController = require('../controllers/rideController');

async function router(fastify, opts) {
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
}

module.exports = router;
