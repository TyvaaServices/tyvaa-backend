import dashboardService from "../services/dashboardService.js";

const dashboardController = {
    // GET /api/dashboard/stats
    getStats: async (request, reply) => {
        try {
            const stats = await dashboardService.getDashboardStats();
            return reply.status(200).send(stats);
        } catch (error) {
            request.log.error(error, "Error fetching dashboard stats");
            return reply.status(500).send({
                error: {
                    code: "DASHBOARD_STATS_ERROR",
                    message: "Failed to fetch dashboard statistics",
                    details: error.message,
                },
            });
        }
    },

    // GET /api/dashboard/activities
    getRecentActivities: async (request, reply) => {
        try {
            const { limit = 10 } = request.query;
            const activities = await dashboardService.getRecentActivities(
                parseInt(limit)
            );
            return reply.status(200).send({ activities });
        } catch (error) {
            request.log.error(error, "Error fetching recent activities");
            return reply.status(500).send({
                error: {
                    code: "ACTIVITIES_FETCH_ERROR",
                    message: "Failed to fetch recent activities",
                    details: error.message,
                },
            });
        }
    },

    // GET /api/dashboard/sales-chart
    getSalesChart: async (request, reply) => {
        try {
            const { period = "30days" } = request.query;
            const data = await dashboardService.getSalesChartData(period);
            return reply.status(200).send({ data });
        } catch (error) {
            request.log.error(error, "Error fetching sales chart data");
            return reply.status(500).send({
                error: {
                    code: "SALES_CHART_ERROR",
                    message: "Failed to fetch sales chart data",
                    details: error.message,
                },
            });
        }
    },

    // GET /api/dashboard/top-products
    getTopProducts: async (request, reply) => {
        try {
            const { limit = 5 } = request.query;
            const products = await dashboardService.getTopProducts(
                parseInt(limit)
            );
            return reply.status(200).send({ products });
        } catch (error) {
            request.log.error(error, "Error fetching top products");
            return reply.status(500).send({
                error: {
                    code: "TOP_PRODUCTS_ERROR",
                    message: "Failed to fetch top products",
                    details: error.message,
                },
            });
        }
    },

    // GET /api/dashboard/user-growth
    getUserGrowth: async (request, reply) => {
        try {
            const { period = "30days" } = request.query;
            const data = await dashboardService.getUserGrowthData(period);
            return reply.status(200).send({ data });
        } catch (error) {
            request.log.error(error, "Error fetching user growth data");
            return reply.status(500).send({
                error: {
                    code: "USER_GROWTH_ERROR",
                    message: "Failed to fetch user growth data",
                    details: error.message,
                },
            });
        }
    },

    // GET /api/dashboard/performance
    getPerformanceMetrics: async (request, reply) => {
        try {
            const metrics = await dashboardService.getPerformanceMetrics();
            return reply.status(200).send({ metrics });
        } catch (error) {
            request.log.error(error, "Error fetching performance metrics");
            return reply.status(500).send({
                error: {
                    code: "PERFORMANCE_METRICS_ERROR",
                    message: "Failed to fetch performance metrics",
                    details: error.message,
                },
            });
        }
    },

    // GET /api/dashboard/total-users
    getTotalUsers: async (request, reply) => {
        try {
            const totalUsers = await dashboardService.getTotalUsers();
            return reply.status(200).send({ totalUsers });
        } catch (error) {
            request.log.error(error, "Error fetching total users");
            return reply.status(500).send({
                error: {
                    code: "TOTAL_USERS_ERROR",
                    message: "Failed to fetch total users",
                    details: error.message,
                },
            });
        }
    },

    // GET /api/dashboard/monthly-summary
    getMonthlySummary: async (request, reply) => {
        try {
            const summary = await dashboardService.getMonthlySummary();
            return reply.status(200).send(summary);
        } catch (error) {
            request.log.error(error, "Error fetching monthly summary");
            return reply.status(500).send({
                error: {
                    code: "MONTHLY_SUMMARY_ERROR",
                    message: "Failed to fetch monthly summary",
                    details: error.message,
                },
            });
        }
    },
};

export default dashboardController;
