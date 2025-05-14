const userController = require('../controllers/userController');

async function userRoutes(fastify, opts) {
    fastify.get('/health', userController.health);
    fastify.get('/users', userController.getAllUsers);
    fastify.post('/login', userController.login);
    fastify.get('/users/:id', userController.getUserById);
    fastify.post('/users', userController.createUser);
    fastify.put('/users/:id', userController.updateUser);
    fastify.delete('/users/:id', userController.deleteUser);
    fastify.post('/users/:id/fcm-token', userController.updateFcmToken);
    fastify.post('/users/:id/update-location', userController.updateLocation);
}

module.exports = userRoutes;
