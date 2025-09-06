/**
 * Payment Controller
 *
 * Handles payment transaction endpoints (initiate, status, refund, confirm).
 *
 * SECURITY NOTE:
 * - Validate and sanitize all payment data.
 * - Never log sensitive transaction details.
 * - Use strong authentication and authorization for payment actions.
 * - Monitor for fraud and suspicious activity.
 * - Ensure PCI DSS compliance for payment processing.
 *
 * @module controllers/paymentController
 */

import { DexchangeClient } from 'dexchange-api-sdk';

const client = new DexchangeClient({
  apiKey: process.env.DEXCHANGE_API_KEY,
  baseUrl: process.env.DEXCHANGE_BASE_URL || 'https://api-m.dexchange.sn/v1',
});

/**
 * Initiate a payment transaction (Wave, Orange, Wizall, Free)
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
async function initTransaction(request, reply) {
  try {
    const response = await client.transaction.init(request.body);
    reply.send(response);
  } catch (error) {
    reply.send(error);
  }
}

/**
 * Get transaction status
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
async function getTransactionStatus(request, reply) {
  try {
    const response = await client.transaction.getTransaction(request.params.transactionId);
    reply.send(response);
  } catch (error) {
    reply.send(error);
  }
}

/**
 * Refund a transaction
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
async function refundTransaction(request, reply) {
  try {
    const response = await client.transaction.refund(request.params.transactionId);
    reply.send(response);
  } catch (error) {
    reply.send(error);
  }
}

/**
 * Confirm Wizall transaction with OTP
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
async function confirmWizall(request, reply) {
  try {
    const response = await client.transaction.confirmWizall(request.body);
    reply.send(response);
  } catch (error) {
    reply.send(error);
  }
}

export default {
  initTransaction,
  getTransactionStatus,
  refundTransaction,
  confirmWizall
};
