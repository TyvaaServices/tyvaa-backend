import paymentController from '../controllers/paymentController.js';

async function paymentRoutes(fastify, opts) {
   fastify.post('/pay', paymentController.createPayment);
   fastify.get('/', paymentController.getAllPayment);
}

export default paymentRoutes;
