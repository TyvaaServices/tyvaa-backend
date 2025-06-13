const rideRatingController = require('../controllers/rideRatingController');

async function rideRoutes(fastify, opts) {
    fastify.post('/rides/:id/rate', rideRatingController.rateRide);
    fastify.post('/rides/:id/report', rideRatingController.reportRide);
    fastify.post('/rides/:id/notify', rideRatingController.notifyRide);
}

module.exports = rideRoutes;
