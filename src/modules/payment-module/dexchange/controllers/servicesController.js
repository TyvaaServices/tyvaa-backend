/**
 * Services Controller
 *
 * Handles service-related endpoints such as balance and available payment services.
 *
 * SECURITY NOTE:
 * - Never expose sensitive data in logs or error messages.
 * - Always validate and sanitize all inputs.
 * - Use centralized error handling to avoid leaking internal details.
 * - Monitor for suspicious activity and set up alerting.
 * - Ensure API keys are securely managed and rotated regularly.
 *
 * @module controllers/servicesController
 */

import DotEnv from 'dotenv';
DotEnv.config();
import { DexchangeClient } from 'dexchange-api-sdk';

const client = new DexchangeClient({
  apiKey: process.env.DEXCHANGE_API_KEY,
  // Base URL should NOT include /v1; SDK handles versioning
  baseUrl: process.env.DEXCHANGE_BASE_URL || 'https://api-m.dexchange.sn',
});

/**
 * Get current account balance
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
async function getBalance(request, reply) {
  try {
    const response = await client.services.getBalance();
    reply.send(response);
  } catch (error) {
    reply.send(error);
  }
}

/**
 * List available payment services
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
async function getServices(request, reply) {
  try {
    const response = await client.services.getServices();
    reply.send(response);
  } catch (error) {
    reply.send(error);
  }
}

export default {
  getBalance,
  getServices
};
