require('dotenv').config();
const fastify = require('fastify');
const app = fastify({logger: true});

const {createClient} = require('ioredis');
const {Server} = require('socket.io');
const axios = require('axios');

let redis;
let io;
let redisAvailable = true;

async function startServer() {
    try {
        redis = createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
        });

        redis.on('error', (err) => {
            console.error('Redis error:', err);
            redisAvailable = false;
        });

        await redis.ping();
        console.log('Redis connected successfully');
        redisAvailable = true;

        app.decorate('redis', redis);

    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        redisAvailable = false;
    }

    const port = process.env.PORT || 2005;
    try {
        await app.listen({port, host: '0.0.0.0'});
        app.log.info(`Server listening at http://0.0.0.0:${port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }

    if (redisAvailable) {
        io = new Server(app.server, {
            cors: {
                origin: '*',
            },
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('updateLocation', async (data) => {
                console.log(data)
                try {
                    const {userId, location} = data;

                    socket.data.userId = userId;
                    socket.data.location = location;

                    await redis.geoadd('users:locations', location.longitude, location.latitude, userId);
                    await redis.set(`${userId}:location`, JSON.stringify({userId, location}));

                    io.emit('locationUpdate', {userId, location});
                } catch (err) {
                    console.error('Error in updateLocation:', err);
                }
            });

            socket.on('disconnect', async () => {
                console.log('Client disconnected:', socket.id);
                const {userId} = socket.data;
                if (!userId) return;

                const locationData = await redis.get(`${userId}:location`);
                if (!locationData) return;

                const parsed = JSON.parse(locationData);
                console.log(`Logging last known location for User ID: ${userId}`);

                try {
                    const response = await axios.post(`http://localhost:2003/users/${parsed.userId}/update-location`, {
                        location: parsed.location,
                    });

                    if (response.status === 200) {
                        console.log(`Location updated successfully for User ID: ${userId}`);
                    } else {
                        console.log(`Failed to update location for User ID: ${userId}`);
                    }
                } catch (e) {
                    console.error(`Error sending location for User ID: ${userId} to user service.`);
                }
            });
        });
    } else {
        process.exit();
        app.log.warn('Redis not available. Skipping Socket.IO initialization.');
    }
}

startServer();
