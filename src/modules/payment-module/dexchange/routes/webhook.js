/**
 * @module routes/webhook
 * @description Fastify plugin for payment provider webhook endpoint.
 * Receives transaction status notifications and delegates to controller.
 *
 * Usage:
 *   fastify.register(require('./routes/webhook'));
 */
import webhookController from '../controllers/webhookController.js';

/**
 * Registers the webhook POST endpoint.
 * @param {import('fastify').FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Plugin options
 */
export default async function webhookRoutes(fastify, opts) {
  fastify.post('/webhook', {
    schema: {
      description: 'Receives transaction status notifications from payment provider.',
      body: {
        type: 'object',
        required: [
          'id',
          'externalTransactionId',
          'transactionType',
          'AMOUNT',
          'FEE',
          'PHONE_NUMBER',
          'STATUS',
          'COMPLETED_AT',
          'BALANCE',
          'PREVIOUS_BALANCE',
          'CURRENT_BALANCE'
        ],
        properties: {
          id: { type: 'string', description: 'Internal transaction ID' },
          externalTransactionId: { type: 'string', description: 'External transaction reference' },
          transactionType: { type: 'string', description: 'Type of transaction' },
          AMOUNT: { type: 'number', description: 'Transaction amount' },
          FEE: { type: 'number', description: 'Transaction fee' },
          PHONE_NUMBER: { type: 'string', description: 'Phone number' },
          STATUS: { type: 'string', description: 'Transaction status' },
          CUSTOM_DATA: { type: 'string', description: 'Custom data (JSON string)' },
          COMPLETED_AT: { type: 'string', format: 'date-time', description: 'Completion timestamp' },
          BALANCE: { type: 'number', description: 'Current balance' },
          PREVIOUS_BALANCE: { type: 'number', description: 'Previous balance' },
          CURRENT_BALANCE: { type: 'number', description: 'Current balance (duplicate)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, webhookController.handleWebhook);
}

