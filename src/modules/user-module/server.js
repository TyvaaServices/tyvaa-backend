import userRoutes from "./routes/userRouter.js";
import dotenv from "dotenv";
import multipart from "@fastify/multipart";

dotenv.config();

export default async function (fastify, opts) {
    fastify.register(multipart);
    fastify.register(userRoutes, { prefix: "/api/v1" });
}
