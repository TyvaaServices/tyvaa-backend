import { auditController } from "../controllers/auditController.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the audit log
 *         fullName:
 *           type: string
 *           description: Full name of the user who performed the action
 *         actionType:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, VIEW, EXPORTS_DATA, LOGIN, LOGOUT]
 *           description: Type of action performed
 *         entityType:
 *           type: string
 *           description: Type of entity affected (User, Booking, Payment, etc.)
 *         entityId:
 *           type: integer
 *           description: ID of the affected entity
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the action was performed
 *         details:
 *           type: string
 *           description: Description of the action
 *         user:
 *           type: object
 *           description: User who performed the action
 *
 *     AuditStats:
 *       type: object
 *       properties:
 *         totalLogs:
 *           type: integer
 *           description: Total number of audit logs in the period
 *         actionBreakdown:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               actionType:
 *                 type: string
 *               count:
 *                 type: integer
 *         entityBreakdown:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               entityType:
 *                 type: string
 *               count:
 *                 type: integer
 */

export default async function auditRoutes(fastify) {
    /**
     * @swagger
     * /api/v1/audit/logs:
     *   get:
     *     summary: Get all audit logs with pagination and filtering
     *     tags: [Audit]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Page number for pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *         description: Number of items per page
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search by user name or email
     *       - in: query
     *         name: entityType
     *         schema:
     *           type: string
     *         description: Filter by entity type
     *       - in: query
     *         name: actionType
     *         schema:
     *           type: string
     *         description: Filter by action type
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date
     *         description: Start date for filtering (YYYY-MM-DD)
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date
     *         description: End date for filtering (YYYY-MM-DD)
     *     responses:
     *       200:
     *         description: Successfully retrieved audit logs
     */
    fastify.get("/logs", async (request, reply) => {
        return auditController.getAllAuditLogs(request, reply);
    });

    /**
     * @swagger
     * /api/v1/audit/stats:
     *   get:
     *     summary: Get audit statistics
     *     tags: [Audit]
     *     parameters:
     *       - in: query
     *         name: period
     *         schema:
     *           type: string
     *           enum: [7days, 30days, 90days]
     *           default: 30days
     *         description: Time period for statistics
     *     responses:
     *       200:
     *         description: Successfully retrieved audit statistics
     */
    fastify.get("/stats", async (request, reply) => {
        return auditController.getAuditStats(request, reply);
    });

    /**
     * @swagger
     * /api/v1/audit/entity-types:
     *   get:
     *     summary: Get available entity types for filtering
     *     tags: [Audit]
     *     responses:
     *       200:
     *         description: Successfully retrieved entity types
     */
    fastify.get("/entity-types", async (request, reply) => {
        return auditController.getEntityTypes(request, reply);
    });

    /**
     * @swagger
     * /api/v1/audit/action-types:
     *   get:
     *     summary: Get available action types for filtering
     *     tags: [Audit]
     *     responses:
     *       200:
     *         description: Successfully retrieved action types
     */
    fastify.get("/action-types", async (request, reply) => {
        return auditController.getActionTypes(request, reply);
    });
}
