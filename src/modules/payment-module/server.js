const router = require('./routes/paymentRouter');
require('dotenv').config();
module.exports = async function (fastify, opts) {
    fastify.register(router, { prefix: '/api/v1/payments' });
};
