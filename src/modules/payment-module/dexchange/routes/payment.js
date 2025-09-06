import paymentController from '../controllers/paymentController.js';

/**
 * Payment Routes
 *
 * Defines endpoints for payment transactions (initiate, status, refund, confirm).
 *
 * SECURITY NOTE:
 * - Apply authentication and authorization to all endpoints.
 * - Validate and sanitize all payment data.
 * - Use rate limiting and monitoring to prevent abuse and fraud.
 *
 * @module routes/payment
 */

/**
 * Fastify plugin for payment routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts
 */
export default async function (fastify, opts) {
  /**
   * Initiate payment (Wave, Orange, Wizall, Free)
   * @route POST /api/payment/init
   */
  fastify.post('/init', {
    schema: {
      body: {
        type: 'object',
        required: [
          'externalTransactionId', 'serviceCode', 'amount', 'number',
          'callBackURL', 'successUrl', 'failureUrl'
        ],
        properties: {
          externalTransactionId: { type: 'string', minLength: 8, maxLength: 64 },
          serviceCode: { type: 'string', minLength: 2, maxLength: 32 },
          amount: { type: 'number', minimum: 1, maximum: 1000000 },
          number: { type: 'string', pattern: '^\\+?[0-9]{8,15}$' },
          callBackURL: { type: 'string', format: 'uri' },
          successUrl: { type: 'string', format: 'uri' },
          failureUrl: { type: 'string', format: 'uri' }
        },
        additionalProperties: false
      }
    }
  }, async (req, reply) => {
    /** Sanitize string fields */
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim().replace(/[<>"'`]/g, '');
      }
    });
    await paymentController.initTransaction(req, reply);
  });

  /**
   * Get transaction status
   * @route GET /api/payment/:transactionId
   */
  fastify.get('/:transactionId', {
    schema: {
      params: {
        type: 'object',
        required: ['transactionId'],
        properties: {
          transactionId: { type: 'string', minLength: 8, maxLength: 64 }
        },
        additionalProperties: false
      }
    }
  }, paymentController.getTransactionStatus);

  /**
   * Refund transaction
   * @route POST /api/payment/refund/:transactionId
   */
  fastify.post('/refund/:transactionId', {
    schema: {
      params: {
        type: 'object',
        required: ['transactionId'],
        properties: {
          transactionId: { type: 'string', minLength: 8, maxLength: 64 }
        },
        additionalProperties: false
      }
    }
  }, paymentController.refundTransaction);

  /**
   * Confirm Wizall transaction
   * @route POST /api/payment/confirm-wizall
   */
  fastify.post('/confirm-wizall', {
    schema: {
      body: {
        type: 'object',
        required: ['externalTransactionId', 'otp'],
        properties: {
          externalTransactionId: { type: 'string', minLength: 8, maxLength: 64 },
          otp: { type: 'string', minLength: 4, maxLength: 8, pattern: '^[0-9]+$' }
        },
        additionalProperties: false
      }
    }
  }, async (req, reply) => {
    /** Sanitize string fields */
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim().replace(/[<>"'`]/g, '');
      }
    });
    await paymentController.confirmWizall(req, reply);
  });
}
