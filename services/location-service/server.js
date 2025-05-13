require('dotenv').config();
const fastify = require('fastify');
const app = fastify({logger: true});
const {createClient} = require('ioredis');
const {Server} = require('socket.io');
const redis = createClient({host: `${process.env.REDIS_HOST}` || 'localhost', port: process.env.REDIS_PORT || 6379});
redis.on('error', (err) => console.error('Redis error:', err));
app.decorate('redis', redis);
const io = new Server(app.server, {
    cors: {
        origin: '*',
    },
});
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let dataGlobal = {};
    socket.on('updateLocation', async (data) => {
        const {userId, location} = data;
        dataGlobal = {userId, location};
        const locationData = {userId, location};

        await redis.set(`${userId}:location`, JSON.stringify(locationData));

        io.emit('locationUpdate', {userId, location});
    });

    socket.on('disconnect', async () => {
        try {
            let locationData = await redis.get(`${dataGlobal.userId}:location`);
            locationData = JSON.parse(locationData);
            console.log(locationData);
            // await axios.post('http://localhost:2002/api/v1/user/updateLocation', {
            //     userId: locationData.userId,
            //     location: locationData.location
            // });
        } catch (e) {
            console.log('Error while sending location to user service', e);
        }
        console.log('Client disconnected:', socket.id);
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


