const axios = require('axios');

function router(fastify, opts) {
    const User = require('./../model/user');
    fastify.get('/health', async (req, reply) => {
        return {status: 'user-service running'};
    });

    function generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    fastify.get('/users', async (req, reply) => {
        const users = await User.findAll();
        //console.log(users);
        return reply.send({users});
    });
    //login
    fastify.post('/login', async (req, reply) => {
        const {phoneNumber} = req.body;
        console.log("here");
        const user = await User.findOne({where: {phoneNumber}});
        if (!user) {
            return reply.status(404).send({error: 'User not found'});
        } else {
            const otp = generateOTP();
            const response = await axios.post('http://localhost:2002/token',
                {
                    id: user.id,
                    phoneNumber: user.phoneNumber,
                });
            //console.log(response);
            const token = response.data.token;
            // Vous pouvez ici envoyer l'OTP via SMS ou email
            console.log(`OTP for ${user.phoneNumber}: ${otp}`);
            return reply.send({user, otp, token});
        }
    });
    fastify.get('/users/:id', async (req, reply) => {
        const {id} = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return reply.status(404).send({error: 'User not found'});
        } else {
            return reply.send({user});
        }

    });
    fastify.post('/users', async (req, reply) => {
        const {phoneNumber} = req.body;
        const existingUser = await User.findOne({where: {phoneNumber}});
        if (existingUser) {
            return reply.status(400).send({error: 'User already exists'});
        } else {
            const user = await User.create({phoneNumber});
            return reply.status(201).send({user});
        }

    });

    fastify.put('/users/:id', async (req, reply) => {
        const {id} = req.params;
        const {phoneNumber} = req.body;
        const user = await User.findByPk(id);
        if (!user) {
            return reply.status(404).send({error: 'User not found'});
        } else {
            user.phoneNumber = phoneNumber;
            await user.save();
            return reply.send({user});
        }
    });

    fastify.delete('/users/:id', async (req, reply) => {
        const {id} = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return reply.status(404).send({error: 'User not found'});
        } else {
            await user.destroy();
            return reply.status(204).send();
        }
    });
    fastify.post('/users/:id/fcm-token', async (req, reply) => {
        const {id} = req.params;
        const {fcmToken} = req.body;
        const user = await User.findByPk(id);
        if (!user) {
            return reply.status(404).send({error: 'User not found'});
        } else {
            user.fcmToken = fcmToken;
            await user.save();
            return reply.send({user});
        }
    });

    fastify.post('/users/:id/update-location', async (req, reply) => {
        const {id} = req.params;
        const {location} = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return reply.status(404).send({error: 'User not found'});
        } else {
            user.latitude = location.latitude;
            user.longitude = location.longitude;
            await user.save();

            return reply.send({
                success: true,
                user,
                message: 'Location updated successfully'
            });
        }
    });
}

module.exports = router;
