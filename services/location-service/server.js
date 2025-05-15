require('dotenv').config();
const fastify = require('fastify');
const app = fastify({logger: true});
const logger = require('./utils/logger');

const {createClient} = require('ioredis');
const {Server} = require('socket.io');
const axios = require('axios');

logger.info('Starting location service');
logger.debug(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.debug(`Redis configuration - Host: ${process.env.REDIS_HOST || 'localhost'}, Port: ${process.env.REDIS_PORT || 6379}`);

let redis;
let io;
let redisAvailable = true;
const userSocketMap = new Map();

app.post('/match-ride', async (request, reply) => {
    const {riderId, location} = request.body;
    logger.info(`Received match-ride request for rider ID: ${riderId}`);
    logger.debug(`Request payload: ${JSON.stringify(request.body)}`);

    if (!location || !riderId) {
        logger.warn(`Invalid match-ride request - Missing data: ${!location ? 'location' : 'riderId'}`);
        return reply.code(400).send({error: 'Missing location or riderId'});
    }

    try {
        logger.debug(`Searching for drivers near location: [${location.latitude}, ${location.longitude}]`);
        const drivers = await redis.georadius(
            'drivers:locations',
            location.longitude,
            location.latitude,
            5,
            'km',
            'WITHDIST',
        );

        logger.info(`Found ${drivers.length} nearby drivers within 5km radius`);
        logger.debug(`Available drivers: ${JSON.stringify(drivers)}`);

        if (drivers.length === 0) {
            logger.warn(`No nearby drivers found for rider ${riderId}`);
            return reply.code(404).send({message: 'No nearby drivers found'});
        }

        const [nearestDriver] = drivers;
        const [driverId, distance] = nearestDriver;
        logger.info(`Selected nearest driver ID ${driverId} at distance ${distance}km`);

        const socketId = userSocketMap.get(driverId);
        if (!socketId) {
            logger.warn(`No active socket found for driver ${driverId}`);
            return reply.code(404).send({message: 'Driver is not connected'});
        }

        logger.debug(`Emitting rideRequest event to driver ${driverId} (socket: ${socketId})`);
        io.to(socketId).emit('rideRequest', {riderId, location});
        logger.info(`Ride request sent to driver ${driverId} for rider ${riderId}`);

        return reply.send({
            driverId,
            distance: `${distance} km`,
        });

    } catch (err) {
        logger.error(`Error in match-ride endpoint: ${err.message}`);
        logger.debug(`Error stack: ${err.stack}`);
        return reply.code(500).send({error: 'Internal server error'});
    }
});

app.get('/health', async (request, reply) => {
    logger.info('Health check endpoint called');
    const redisStatus = redisAvailable ? 'connected' : 'disconnected';
    logger.debug(`Health check - Redis status: ${redisStatus}`);
    return reply.send({
        status: 'location-service running',
        redis: redisStatus,
        socketConnections: io ? io.sockets.sockets.size : 0
    });
});

async function startServer() {
    logger.info('Initializing location service components');

    try {
        logger.info('Attempting to connect to Redis');
        redis = createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
        });

        redis.on('error', (err) => {
            logger.error(`Redis connection error: ${err.message}`);
            logger.debug(`Redis error details: ${JSON.stringify(err)}`);
            redisAvailable = false;
        });

        redis.on('connect', () => {
            logger.info('Redis client connected');
        });

        redis.on('reconnecting', () => {
            logger.warn('Redis client reconnecting');
        });

        await redis.ping();
        logger.info('Redis connection verified with PING');
        redisAvailable = true;

        app.decorate('redis', redis);
        logger.debug('Redis client attached to Fastify instance');

    } catch (err) {
        logger.error(`Failed to initialize Redis: ${err.message}`);
        logger.debug(`Redis error stack: ${err.stack}`);
        redisAvailable = false;
    }

    const port = process.env.PORT || 2005;
    try {
        await app.listen({port, host: '0.0.0.0'});
        logger.info(`Server started successfully on port ${port}`);
        logger.debug(`Server is listening at http://0.0.0.0:${port}`);
    } catch (err) {
        logger.error(`Failed to start server: ${err.message}`);
        logger.debug(`Error stack: ${err.stack}`);
        process.exit(1);
    }

    if (redisAvailable) {
        logger.info('Initializing Socket.IO server');
        io = new Server(app.server, {
            cors: {
                origin: '*',
            },
        });

        io.on('connection', (socket) => {
            logger.info(`New socket connection established: ${socket.id}`);
            logger.debug(`Socket ${socket.id} connection details - IP: ${socket.handshake.address}, User Agent: ${socket.handshake.headers['user-agent']}`);

            socket.on('updateLocation', async (data) => {
                logger.info(`Location update received from socket ${socket.id}`);
                logger.debug(`Location update data: ${JSON.stringify(data)}`);

                try {
                    const {userId, location} = data;
                    logger.info(`Processing location update for user ${userId} at [${location.latitude}, ${location.longitude}]`);

                    userSocketMap.set(userId, socket.id);
                    logger.debug(`User ${userId} mapped to socket ${socket.id}`);

                    socket.data.userId = userId;
                    socket.data.location = location;

                    if (data.isDriver && data.isOnline && data.isVerified) {
                        logger.info(`Adding driver ${userId} to geo index`);
                        await redis.geoadd('drivers:locations', location.longitude, location.latitude, userId);
                        logger.debug(`Driver ${userId} added to 'drivers:locations' at [${location.longitude}, ${location.latitude}]`);
                    }

                    await redis.geoadd('users:locations', location.longitude, location.latitude, userId);
                    logger.debug(`User ${userId} added to 'users:locations' at [${location.longitude}, ${location.latitude}]`);

                    await redis.set(`${userId}:location`, JSON.stringify({userId, location}));
                    logger.debug(`User ${userId} latest location cached with key '${userId}:location'`);

                    io.emit('locationUpdate', {userId, location});
                    logger.info(`Location update for user ${userId} broadcasted to all connected clients`);

                } catch (err) {
                    logger.error(`Error processing location update for socket ${socket.id}: ${err.message}`);
                    logger.debug(`Error stack: ${err.stack}`);
                    logger.debug(`Problematic location data: ${JSON.stringify(data)}`);
                }
            });

            socket.on('disconnect', async () => {
                logger.info(`Socket disconnected: ${socket.id}`);
                const {userId} = socket.data;

                if (!userId) {
                    logger.debug(`Socket ${socket.id} disconnected without user ID association`);
                    return;
                }

                logger.debug(`User ${userId} disconnected (socket: ${socket.id})`);
                const locationData = await redis.get(`${userId}:location`);

                if (!locationData) {
                    logger.debug(`No cached location found for user ${userId}`);
                    return;
                }

                try {
                    const parsed = JSON.parse(locationData);
                    logger.info(`Persisting last known location for user ${userId}`);
                    logger.debug(`Last location for user ${userId}: ${JSON.stringify(parsed.location)}`);

                    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:2003';
                    logger.debug(`Sending location update to user service at: ${userServiceUrl}/users/${parsed.userId}/update-location`);

                    const response = await axios.post(`${userServiceUrl}/users/${parsed.userId}/update-location`, {
                        location: parsed.location,
                    });

                    if (response.status === 200) {
                        logger.info(`Location successfully persisted to user service for user ${userId}`);
                        logger.debug(`User service response: ${JSON.stringify(response.data)}`);
                    } else {
                        logger.warn(`Failed to persist location for user ${userId} - Status: ${response.status}`);
                        logger.debug(`User service error response: ${JSON.stringify(response.data)}`);
                    }
                } catch (err) {
                    logger.error(`Error persisting location for user ${userId}: ${err.message}`);
                    logger.debug(`Error stack: ${err.stack}`);
                    if (err.response) {
                        logger.debug(`User service error details: ${JSON.stringify(err.response.data)}`);
                    }
                } finally {
                    userSocketMap.delete(userId);
                    logger.debug(`Removed socket mapping for user ${userId}`);
                }
            });

            // Additional socket event handlers
            socket.on('error', (err) => {
                logger.error(`Socket ${socket.id} error: ${err.message}`);
                logger.debug(`Socket error stack: ${err.stack}`);
            });
        });

        logger.info('Socket.IO server initialized successfully');
        logger.debug(`Socket.IO configuration: CORS origin: '*'`);
    } else {
        logger.warn('Redis unavailable - Socket.IO initialization skipped');
        logger.info('Location service starting in limited mode (API only)');
    }
}

// Process events handling
process.on('SIGINT', () => {
    logger.info('Received SIGINT signal - shutting down location service');
    if (redis && redis.disconnect) {
        logger.debug('Closing Redis connection');
        redis.disconnect();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal - shutting down location service');
    if (redis && redis.disconnect) {
        logger.debug('Closing Redis connection');
        redis.disconnect();
    }
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`);
    logger.debug(`Error stack: ${err.stack}`);
    process.exit(1);
});

startServer();
