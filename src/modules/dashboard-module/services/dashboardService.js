import {
    User,
    Booking,
    Payment,
    RideInstance,
    AuditLog,
    DriverApplication,
} from "#config/index.js";
import { Op } from "sequelize";
import sequelize from "#config/db.js";

const dashboardService = {
    // Cache TTL en secondes (5 minutes)
    CACHE_TTL: 300,

    async getDashboardStats() {
        const cacheKey = "dashboard:stats";

        // TODO: Implémenter cache Redis ici
        // const cached = await redisClient.get(cacheKey);
        // if (cached) return JSON.parse(cached);

        const [totalUsers, totalBookings, totalRevenue, lastMonthRevenue] =
            await Promise.all([
                User.count({ where: { isActive: true } }),
                Booking.count({ where: { status: "booked" } }),
                Payment.sum("amount", { where: { status: "completed" } }),
                Payment.sum("amount", {
                    where: {
                        status: "completed",
                        createdAt: {
                            [Op.gte]: new Date(
                                Date.now() - 30 * 24 * 60 * 60 * 1000
                            ),
                        },
                    },
                }),
            ]);

        const thisMonthRevenue = await Payment.sum("amount", {
            where: {
                status: "completed",
                createdAt: {
                    [Op.gte]: new Date(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        1
                    ),
                },
            },
        });

        const growthRate =
            lastMonthRevenue > 0
                ? (
                      ((thisMonthRevenue - lastMonthRevenue) /
                          lastMonthRevenue) *
                      100
                  ).toFixed(2)
                : 0;

        const stats = {
            totalUsers: totalUsers || 0,
            totalOrders: totalBookings || 0,
            totalRevenue: totalRevenue || 0,
            growthRate: parseFloat(growthRate),
        };

        // TODO: Cache result
        // await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(stats));

        return stats;
    },

    async getRecentActivities(limit = 10) {
        const cacheKey = `dashboard:activities:${limit}`;

        const auditLogs = await AuditLog.findAll({
            limit,
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: User,
                    attributes: ["id", "fullName", "profileImage"],
                },
            ],
        });

        const activities = auditLogs.map((log) => ({
            id: log.id.toString(),
            type: this.mapActionToType(log.actionType),
            description: this.generateActivityDescription(log),
            timestamp: log.createdAt.toISOString(),
            user: {
                id: log.User?.id?.toString() || "unknown",
                name: log.User?.fullName || "Unknown User",
                avatar: log.User?.profileImage || "/default-avatar.png",
            },
        }));

        return activities;
    },

    async getSalesChartData(period) {
        const cacheKey = `dashboard:sales:${period}`;

        const days = this.getPeriodDays(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const salesData = await Payment.findAll({
            attributes: [
                [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
                [sequelize.fn("SUM", sequelize.col("amount")), "sales"],
                [sequelize.fn("COUNT", sequelize.col("id")), "orders"],
            ],
            where: {
                status: "completed",
                createdAt: { [Op.gte]: startDate },
            },
            group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
            order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
        });

        const data = salesData.map((item) => ({
            date: item.getDataValue("date"),
            sales: parseFloat(item.getDataValue("sales")) || 0,
            orders: parseInt(item.getDataValue("orders")) || 0,
        }));

        return data;
    },

    async getTopProducts(limit = 5) {
        const cacheKey = `dashboard:top-products:${limit}`;

        // Pour Tyvaa, on va adapter avec les trajets les plus réservés
        const topRides = await RideInstance.findAll({
            attributes: [
                "id",
                [sequelize.col("RideModel.departure"), "departure"],
                [sequelize.col("RideModel.destination"), "destination"],
                [
                    sequelize.fn("COUNT", sequelize.col("Bookings.id")),
                    "bookingCount",
                ],
                [
                    sequelize.fn("SUM", sequelize.col("Payments.amount")),
                    "revenue",
                ],
            ],
            include: [
                {
                    model: Booking,
                    attributes: [],
                    include: [
                        {
                            model: Payment,
                            attributes: [],
                            where: { status: "completed" },
                            required: false,
                        },
                    ],
                },
                {
                    association: "RideModel",
                    attributes: [],
                },
            ],
            group: [
                "RideInstance.id",
                "RideModel.departure",
                "RideModel.destination",
            ],
            order: [
                [sequelize.fn("COUNT", sequelize.col("Bookings.id")), "DESC"],
            ],
            limit,
        });

        const products = topRides.map((ride) => ({
            id: ride.id.toString(),
            name: `${ride.getDataValue("departure")} → ${ride.getDataValue("destination")}`,
            sales: parseInt(ride.getDataValue("bookingCount")) || 0,
            revenue: parseFloat(ride.getDataValue("revenue")) || 0,
            image: "/ride-placeholder.png",
        }));

        return products;
    },

    async getUserGrowthData(period) {
        const cacheKey = `dashboard:user-growth:${period}`;

        const days = this.getPeriodDays(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const userGrowth = await User.findAll({
            attributes: [
                [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
                [sequelize.fn("COUNT", sequelize.col("id")), "newUsers"],
            ],
            where: {
                createdAt: { [Op.gte]: startDate },
            },
            group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
            order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
        });

        let cumulativeUsers = await User.count({
            where: { createdAt: { [Op.lt]: startDate } },
        });

        const data = userGrowth.map((item) => {
            const newUsers = parseInt(item.getDataValue("newUsers")) || 0;
            cumulativeUsers += newUsers;

            return {
                date: item.getDataValue("date"),
                newUsers,
                totalUsers: cumulativeUsers,
            };
        });

        return data;
    },

    async getPerformanceMetrics() {
        const cacheKey = "dashboard:performance";

        const [
            totalBookings,
            completedBookings,
            totalPayments,
            totalRevenue,
            activeUsers,
            totalUsers,
        ] = await Promise.all([
            Booking.count(),
            Booking.count({ where: { status: "booked" } }),
            Payment.count(),
            Payment.sum("amount", { where: { status: "completed" } }),
            User.count({ where: { isActive: true } }),
            User.count(),
        ]);

        const conversionRate =
            totalBookings > 0
                ? ((completedBookings / totalBookings) * 100).toFixed(2)
                : 0;

        const averageOrderValue =
            totalPayments > 0 ? (totalRevenue / totalPayments).toFixed(2) : 0;

        const customerRetentionRate =
            totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0;

        const metrics = {
            conversionRate: parseFloat(conversionRate),
            averageOrderValue: parseFloat(averageOrderValue),
            customerRetentionRate: parseFloat(customerRetentionRate),
            pageLoadTime: 1.2, // Mock data - à remplacer par de vraies métriques de performance
        };

        return metrics;
    },

    async getTotalUsers() {
        const cacheKey = "dashboard:total-users";

        // TODO: Implémenter cache Redis ici si nécessaire

        const totalUsers = await User.count({ where: { isActive: true } });

        return totalUsers || 0;
    },

    async getMonthlySummary() {
        const cacheKey = "dashboard:monthly-summary";

        // Calculer le début du mois en cours
        const startOfMonth = new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
        );

        const [monthlyRides, totalDriverApplications] = await Promise.all([
            // Compter les trajets du mois (RideInstance créés ce mois)
            RideInstance.count({
                where: {
                    createdAt: {
                        [Op.gte]: startOfMonth,
                    },
                },
            }),

            // Compter toutes les candidatures chauffeur
            DriverApplication.count(),
        ]);

        return {
            monthlyRides: monthlyRides || 0,
            totalDriverApplications: totalDriverApplications || 0,
            month: new Date().toLocaleString("fr-FR", {
                month: "long",
                year: "numeric",
            }),
        };
    },

    // Méthodes utilitaires
    getPeriodDays(period) {
        switch (period) {
            case "7days":
                return 7;
            case "30days":
                return 30;
            case "90days":
                return 90;
            default:
                return 30;
        }
    },

    mapActionToType(actionType) {
        const mapping = {
            create: "user_registered",
            login: "user_login",
            booking: "order_created",
            payment: "payment_completed",
        };
        return mapping[actionType] || "activity";
    },

    generateActivityDescription(log) {
        const descriptions = {
            create: "Nouvel utilisateur enregistré",
            login: "Connexion utilisateur",
            booking: "Nouvelle réservation créée",
            payment: "Paiement effectué",
            update: "Profil mis à jour",
            delete: "Élément supprimé",
        };
        return descriptions[log.actionType] || "Activité système";
    },
};

export default dashboardService;
