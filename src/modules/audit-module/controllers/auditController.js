import { AuditLog, User, AuditAction } from "#config/index.js";
import createLogger from "#utils/logger.js";
import { Op } from "sequelize";

const logger = createLogger("audit-controller");

export const auditController = {
    /**
     * Get all audit logs with pagination and search
     */
    getAllAuditLogs: async (req, reply) => {
        try {
            const {
                page = 1,
                limit = 10,
                search = "",
                entityType = "",
                actionType = "",
                startDate = "",
                endDate = "",
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Build where conditions
            const whereConditions = {};

            // Date range filter
            if (startDate || endDate) {
                whereConditions.timestamp = {};
                if (startDate) {
                    whereConditions.timestamp[Op.gte] = new Date(startDate);
                }
                if (endDate) {
                    whereConditions.timestamp[Op.lte] = new Date(endDate);
                }
            }

            // Entity type filter
            if (entityType) {
                whereConditions.entityType = entityType;
            }

            // User search conditions
            const userWhereConditions = {};
            if (search) {
                userWhereConditions[Op.or] = [
                    { fullName: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                ];
            }

            // Action type filter
            const actionWhereConditions = {};
            if (actionType) {
                actionWhereConditions.actionType = actionType;
            }

            const { count, rows } = await AuditLog.findAndCountAll({
                where: whereConditions,
                include: [
                    {
                        model: User,
                        as: "user",
                        attributes: [
                            "id",
                            "fullName",
                            "email",
                            "phoneNumber",
                            "sexe",
                            "isActive",
                        ],
                        where:
                            Object.keys(userWhereConditions).length > 0
                                ? userWhereConditions
                                : undefined,
                        required: true,
                    },
                    {
                        model: AuditAction,
                        as: "actionType",
                        attributes: ["actionType", "codeAction"],
                        where:
                            Object.keys(actionWhereConditions).length > 0
                                ? actionWhereConditions
                                : undefined,
                        required: true,
                    },
                ],
                order: [["timestamp", "DESC"]],
                limit: parseInt(limit),
                offset: offset,
                distinct: true,
            });

            // Transform data to match frontend model
            const transformedLogs = rows.map((log) => ({
                id: log.id,
                fullName: log.user?.fullName || "Unknown User",
                actionType:
                    log.actionType?.actionType?.toUpperCase() || "UNKNOWN",
                entityType: log.entityType,
                entityId: log.entityId,
                createdAt: log.timestamp,
                details: log.description,
                user: {
                    id: log.user?.id,
                    phoneNumber: log.user?.phoneNumber,
                    fullName: log.user?.fullName,
                    email: log.user?.email,
                    isOnline: false, // This would need real-time tracking
                    sexe: log.user?.sexe,
                    dateOfBirth: null, // Add if needed
                    isAdmin: true, // Assuming audit users are admins
                    isActive: log.user?.isActive,
                    createdAt: log.timestamp,
                    updatedAt: log.timestamp,
                },
            }));

            const totalPages = Math.ceil(count / parseInt(limit));

            logger.info(`Retrieved ${rows.length} audit logs`, {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
            });

            return reply.status(200).send({
                success: true,
                data: {
                    auditLogs: transformedLogs,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalItems: count,
                        itemsPerPage: parseInt(limit),
                        hasNextPage: parseInt(page) < totalPages,
                        hasPrevPage: parseInt(page) > 1,
                    },
                },
            });
        } catch (error) {
            logger.error(`Failed to retrieve audit logs: ${error.message}`, {
                error,
            });
            return reply.status(500).send({
                success: false,
                message: "Failed to retrieve audit logs",
                error: error.message,
            });
        }
    },

    /**
     * Get audit statistics
     */
    getAuditStats: async (req, reply) => {
        try {
            const { period = "30days" } = req.query;

            let dateFilter = {};
            const now = new Date();

            switch (period) {
                case "7days":
                    dateFilter = {
                        [Op.gte]: new Date(
                            now.getTime() - 7 * 24 * 60 * 60 * 1000
                        ),
                    };
                    break;
                case "30days":
                    dateFilter = {
                        [Op.gte]: new Date(
                            now.getTime() - 30 * 24 * 60 * 60 * 1000
                        ),
                    };
                    break;
                case "90days":
                    dateFilter = {
                        [Op.gte]: new Date(
                            now.getTime() - 90 * 24 * 60 * 60 * 1000
                        ),
                    };
                    break;
                default:
                    dateFilter = {
                        [Op.gte]: new Date(
                            now.getTime() - 30 * 24 * 60 * 60 * 1000
                        ),
                    };
            }

            // Get total logs count
            const totalLogs = await AuditLog.count({
                where: { timestamp: dateFilter },
            });

            // Get action type breakdown
            const actionBreakdown = await AuditLog.findAll({
                attributes: [
                    [
                        AuditLog.sequelize.col("actionType.actionType"),
                        "actionType",
                    ],
                    [
                        AuditLog.sequelize.fn(
                            "COUNT",
                            AuditLog.sequelize.col("AuditLog.id")
                        ),
                        "count",
                    ],
                ],
                include: [
                    {
                        model: AuditAction,
                        as: "actionType",
                        attributes: [],
                    },
                ],
                where: { timestamp: dateFilter },
                group: ["actionType.actionType"],
                raw: true,
            });

            // Get entity type breakdown
            const entityBreakdown = await AuditLog.findAll({
                attributes: [
                    "entityType",
                    [
                        AuditLog.sequelize.fn(
                            "COUNT",
                            AuditLog.sequelize.col("id")
                        ),
                        "count",
                    ],
                ],
                where: { timestamp: dateFilter },
                group: ["entityType"],
                raw: true,
            });

            return reply.status(200).send({
                success: true,
                data: {
                    totalLogs,
                    actionBreakdown,
                    entityBreakdown,
                    period,
                },
            });
        } catch (error) {
            logger.error(`Failed to retrieve audit stats: ${error.message}`, {
                error,
            });
            return reply.status(500).send({
                success: false,
                message: "Failed to retrieve audit statistics",
                error: error.message,
            });
        }
    },

    /**
     * Get available entity types for filtering
     */
    getEntityTypes: async (req, reply) => {
        try {
            const entityTypes = await AuditLog.findAll({
                attributes: [
                    [
                        AuditLog.sequelize.fn(
                            "DISTINCT",
                            AuditLog.sequelize.col("entityType")
                        ),
                        "entityType",
                    ],
                ],
                raw: true,
            });

            return reply.status(200).send({
                success: true,
                data: entityTypes.map((item) => item.entityType),
            });
        } catch (error) {
            logger.error(`Failed to retrieve entity types: ${error.message}`, {
                error,
            });
            return reply.status(500).send({
                success: false,
                message: "Failed to retrieve entity types",
                error: error.message,
            });
        }
    },

    /**
     * Get available action types for filtering
     */
    getActionTypes: async (req, reply) => {
        try {
            const actionTypes = await AuditAction.findAll({
                attributes: ["actionType", "codeAction"],
            });

            return reply.status(200).send({
                success: true,
                data: actionTypes,
            });
        } catch (error) {
            logger.error(`Failed to retrieve action types: ${error.message}`, {
                error,
            });
            return reply.status(500).send({
                success: false,
                message: "Failed to retrieve action types",
                error: error.message,
            });
        }
    },
};
