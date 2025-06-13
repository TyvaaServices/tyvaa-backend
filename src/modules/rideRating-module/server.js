const fastify = require('fastify');
const app = fastify({logger: true});
const router = require('./routes/rideRatingRouter');
require('dotenv').config();

app.register(router, {prefix: '/api/v1'});

module.exports = async function (fastify, opts) {
    fastify.register(router, { prefix: '/api/v1' });

};
