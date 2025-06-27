import paymentRoutes from "./routes/paymentRouter.js";
import dotenv from "dotenv";

dotenv.config();

export default async function (fastify, _opts) {
    fastify.register(paymentRoutes, { prefix: "/api/v1/payments" });
}
