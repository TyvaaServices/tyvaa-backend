import dashboardRoutes from "./routes/dashboardRouter.js";

async function dashboardModule(fastify, opts) {
    await fastify.register(dashboardRoutes, { prefix: "/api" });
}

export default dashboardModule;
