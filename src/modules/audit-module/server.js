import auditRoutes from "./routes/auditRoutes.js";

export default async function auditModule(fastify) {
    fastify.register(auditRoutes, { prefix: "/api/v1/audit" });
}
