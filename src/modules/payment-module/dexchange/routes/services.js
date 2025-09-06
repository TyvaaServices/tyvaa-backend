import servicesController from '../controllers/servicesController.js';

/**
 * Services Routes
 *
 * Defines endpoints for service-related operations (balance, list of services).
 *
 * SECURITY NOTE:
 * - Apply authentication and authorization to all endpoints.
 * - Validate and sanitize all incoming requests.
 * - Use rate limiting and monitoring to prevent abuse.
 *
 * @module routes/services
 */

/**
 * Fastify plugin for services routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts
 */
export default async function (fastify, opts) {
  /**
   * Get account balance
   * @route GET /api/services/balance
   */
  fastify.get('/balance', servicesController.getBalance);

  /**
   * List available payment services
   * @route GET /api/services/list
   */
  fastify.get('/list', servicesController.getServices);
}
