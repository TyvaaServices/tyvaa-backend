const axios = require('axios');
const User = require('../models/user');

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
    health: async (req, reply) => {
        return { status: 'user-service running' };
    },

    getAllUsers: async (req, reply) => {
        const users = await User.findAll();
        return reply.send({ users });
    },

    login: async (req, reply) => {
        const { phoneNumber } = req.body;
        const user = await User.findOne({ where: { phoneNumber } });

        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        const otp = generateOTP();
        const response = await axios.post('http://localhost:2002/token', {
            id: user.id,
            phoneNumber: user.phoneNumber,
        });

        const token = response.data.token;
        console.log(`OTP for ${user.phoneNumber}: ${otp}`);
        return reply.send({ user, otp, token });
    },

    getUserById: async (req, reply) => {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return reply.status(404).send({ error: 'User not found' });
        return reply.send({ user });
    },

    createUser: async (req, reply) => {
        const { phoneNumber } = req.body;
        const existingUser = await User.findOne({ where: { phoneNumber } });

        if (existingUser) {
            return reply.status(400).send({ error: 'User already exists' });
        }

        const user = await User.create({ phoneNumber });
        return reply.status(201).send({ user });
    },

    updateUser: async (req, reply) => {
        const { id } = req.params;
        const { phoneNumber } = req.body;
        const user = await User.findByPk(id);

        if (!user) return reply.status(404).send({ error: 'User not found' });

        user.phoneNumber = phoneNumber;
        await user.save();
        return reply.send({ user });
    },

    deleteUser: async (req, reply) => {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) return reply.status(404).send({ error: 'User not found' });

        await user.destroy();
        return reply.status(204).send();
    },

    updateFcmToken: async (req, reply) => {
        const { id } = req.params;
        const { fcmToken } = req.body;
        const user = await User.findByPk(id);

        if (!user) return reply.status(404).send({ error: 'User not found' });

        user.fcmToken = fcmToken;
        await user.save();
        return reply.send({ user });
    },

    updateLocation: async (req, reply) => {
        const { id } = req.params;
        const { location } = req.body;
        const user = await User.findByPk(id);

        if (!user) return reply.status(404).send({ error: 'User not found' });

        user.latitude = location.latitude;
        user.longitude = location.longitude;
        await user.save();

        return reply.send({
            success: true,
            user,
            message: 'Location updated successfully',
        });
    },
};
