const fastify = require('fastify')({logger: true});
require('dotenv').config();
const jwt = require('fastify-jwt');
const logger = require('./utils/logger');

logger.info('Initializing auth service');
logger.debug(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.debug(`JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'Using default'}`);

fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret'
});
logger.info('JWT plugin registered');

// Register global error handler
fastify.setErrorHandler((error, request, reply) => {
    logger.error(`Unhandled error: ${error.message}`);
    logger.debug(`Error stack: ${error.stack}`);
    reply.status(500).send({error: 'Internal Server Error'});
});
logger.debug('Global error handler configured');

fastify.get('/api/v1/health', async (req, reply) => {
    logger.info('Health check endpoint called');
    logger.debug(`Client IP: ${req.ip}`);
    logger.debug('Returning health status');
    return {status: 'auth-service running'};
});

fastify.post('/api/v1/token', async (req, reply) => {
    const {id, phoneNumber} = req.body;
    logger.info(`Token generation requested for user ID: ${id}`);
    logger.debug(`Request payload: ${JSON.stringify(req.body)}`);

    try {
        const token = fastify.jwt.sign({id, phoneNumber});
        logger.info(`Token successfully generated for user ID: ${id}`);
        logger.debug(`Generated token: ${token}`);
        return {token};
    } catch (error) {
        logger.error(`Failed to generate token for user ID ${id}: ${error.message}`);
        logger.debug(`Error stack: ${error.stack}`);
        reply.status(500).send({error: 'Failed to generate token'});
    }
});

fastify.post('/api/v1/verify', async (req, reply) => {
    logger.info('Token verification requested');
    logger.debug(`Request payload: ${JSON.stringify(req.body)}`);

    try {
        const decoded = await fastify.jwt.verify(req.body.token);
        logger.info('Token verified successfully');
        logger.debug(`Decoded token payload: ${JSON.stringify(decoded)}`);
        return {valid: true, decoded};
    } catch (err) {
        logger.warn(`Token verification failed: ${err.message}`);
        logger.debug(`Invalid token: ${req.body.token}`);
        reply.code(401).send({valid: false, error: err.message});
    }
});

const port = process.env.PORT || 2002;
fastify.listen({port, host: '0.0.0.0'})
    .then(address => {
        logger.info(`Auth service started successfully on ${address}`);
        logger.debug(`Server listening on port: ${port}`);
        console.log("auth is up");
    })
    .catch(err => {
        logger.error(`Failed to start server: ${err.message}`);
        logger.debug(`Error stack: ${err.stack}`);
        process.exit(1);
    });

// Log when the process is about to exit
process.on('SIGINT', () => {
    logger.info('Received SIGINT signal, shutting down auth service');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal, shutting down auth service');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`);
    logger.debug(`Error stack: ${err.stack}`);
    process.exit(1);
});
