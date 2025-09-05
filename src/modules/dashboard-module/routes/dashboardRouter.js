import dashboardController from "../controllers/dashboardController.js";

async function dashboardRoutes(fastify, _opts) {
    // Routes du dashboard sans authentification

    // GET /api/dashboard/stats - Statistiques générales du dashboard
    fastify.get("/dashboard/stats", dashboardController.getStats);

    // GET /api/dashboard/activities - Activités récentes
    fastify.get(
        "/dashboard/activities",
        {
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "integer",
                            minimum: 1,
                            maximum: 50,
                            default: 10,
                        },
                    },
                },
            },
        },
        dashboardController.getRecentActivities
    );

    // GET /api/dashboard/sales-chart - Données du graphique des ventes
    fastify.get(
        "/dashboard/sales-chart",
        {
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        period: {
                            type: "string",
                            enum: ["7days", "30days", "90days"],
                            default: "30days",
                        },
                    },
                },
            },
        },
        dashboardController.getSalesChart
    );

    // GET /api/dashboard/top-products - Trajets les plus populaires
    fastify.get(
        "/dashboard/top-products",
        {
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "integer",
                            minimum: 1,
                            maximum: 20,
                            default: 5,
                        },
                    },
                },
            },
        },
        dashboardController.getTopProducts
    );

    // GET /api/dashboard/user-growth - Croissance des utilisateurs
    fastify.get(
        "/dashboard/user-growth",
        {
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        period: {
                            type: "string",
                            enum: ["7days", "30days", "90days"],
                            default: "30days",
                        },
                    },
                },
            },
        },
        dashboardController.getUserGrowth
    );

    // GET /api/dashboard/performance - Métriques de performance
    fastify.get(
        "/dashboard/performance",
        dashboardController.getPerformanceMetrics
    );

    // GET /api/dashboard/total-users - Total des utilisateurs
    fastify.get("/dashboard/total-users", dashboardController.getTotalUsers);

    // GET /api/dashboard/monthly-summary - Résumé mensuel (trajets + candidatures)
    fastify.get(
        "/dashboard/monthly-summary",
        dashboardController.getMonthlySummary
    );
}

export default dashboardRoutes;
