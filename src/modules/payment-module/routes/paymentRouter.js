import paymentController from "../controllers/paymentController.js";

async function paymentRoutes(_fastify, _opts) {
    _fastify.post("/notify", paymentController.notify);
}

export default paymentRoutes;
