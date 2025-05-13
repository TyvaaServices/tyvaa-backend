require('dotenv').config();
const fastify = require('fastify');
const app = fastify({logger: true});

const {createClient} = require('ioredis');
const {Server} = require('socket.io');
const axios = require('axios');

const redis = createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
});
redis.on('error', (err) => console.error('Redis error:', err));
app.decorate('redis', redis);

const io = new Server(app.server, {
    cors: {
        origin: '*',
    },
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('updateLocation', async (data) => {
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
        console.log(`trying to log last known location of User with id : ${userId}`);
        const response = await axios.post(`http://localhost:2003/users/${parsed.userId}/update-location`, {
            location: parsed.location
        }).catch(e => {
            console.log(`Error while sending location of User with id : ${userId}  to user service:`);
        });

        if (response != null && response.status === 200) {
            console.log(`Location updated successfully for User with id : ${userId} in user service`);
        } else {
            console.log(`Failed to update location of User with id : ${userId} in user service`);
        }

    });
});

const port = process.env.PORT || 2005;
app.listen({port: port, host: '0.0.0.0'}, async (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info(`Server listening at ${address}`);
});
