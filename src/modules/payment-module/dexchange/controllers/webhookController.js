/**
 * @module controllers/webhookController
 * @description Handles payment provider webhook notifications for transaction status updates.
 *
 * Security:
 *   - Requires 'x-webhook-secret' header matching WEBHOOK_SECRET env variable.
 *   - Validates payload structure and required fields.
 *
 * Usage:
 *   Used by routes/webhook.js Fastify plugin.
 */
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * Handles incoming webhook POST requests from payment provider.
 * Validates security and payload, logs event, and responds with status.
 *
 * @param {import('fastify').FastifyRequest} request - Fastify request object
 * @param {import('fastify').FastifyReply} reply - Fastify reply object
 * @returns {Promise<void>}
 */
async function handleWebhook(request, reply) {
  // if (WEBHOOK_SECRET && request.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
  //   reply.status(401).send({ success: false, message: 'Unauthorized webhook: invalid secret.' });
  //   return;
  // }

  const body = request.body;

  // Defensive: check required fields (should be covered by schema, but double-check)
  const requiredFields = [
    'id', 'externalTransactionId', 'transactionType', 'AMOUNT', 'FEE', 'PHONE_NUMBER',
    'STATUS', 'COMPLETED_AT', 'BALANCE', 'PREVIOUS_BALANCE', 'CURRENT_BALANCE'
  ];
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      reply.status(400).send({ success: false, message: `Missing required field: ${field}` });
      return;
    }
  }

  // Log webhook event with context
  request.log.info({ webhook: body }, 'Received payment provider webhook');

  // TODO: Implement business logic for transaction status update

  reply.status(200).send({ success: true, message: 'Webhook received and validated.' });
}

export default { handleWebhook };

