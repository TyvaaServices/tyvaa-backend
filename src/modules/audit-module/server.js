import auditRoutes from "./routes/auditRouter.js";
import auditPlugin from "./plugins/auditPlugin.js";
import dotenv from "dotenv";
dotenv.config();

export default async function (fastify, opts) {
    fastify.register(auditPlugin);
    fastify.register(auditRoutes, { prefix: "/api/v1" });
};
