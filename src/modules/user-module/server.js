import userRoutes from "./routes/userRouter.js";
import dotenv from "dotenv";
dotenv.config();
import multipart from "@fastify/multipart";

export default async function (fastify, opts) {
  fastify.register(multipart);
  fastify.register(userRoutes, { prefix: "/api/v1" });
}
