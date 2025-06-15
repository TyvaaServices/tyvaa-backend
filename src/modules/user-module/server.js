const router = require('./routes/userRouter');
require('dotenv').config();
module.exports = async function (fastify, opts) {
    fastify.register(require('@fastify/multipart'));
    fastify.register(router, { prefix: '/api/v1' });
};
