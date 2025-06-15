const paymentController = require('../controllers/paymentController');

async function paymentRoutes(fastify, opts) {
   fastify.post('/pay', paymentController.createPayment);
   fastify.get('/', paymentController.getAllPayment);
}

module.exports = paymentRoutes;
