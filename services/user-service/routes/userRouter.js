

function router(fastify,opts){
    const User = require('./../model/user');
    fastify.get('/health', async (req, reply) => {
        return {status: 'user-service running'};
    });

    fastify.get('/users', async (req, reply) => {
        const users = await User.findAll();
        return reply.send({users});
    });

    fastify.get('/users/:id', async (req, reply) => {
        const {id} = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return reply.status(404).send({error: 'User not found'});
        }else{
            return reply.send({user});
        }
        
    });

    fastify.post('/users', async (req, reply) => {
        const {phoneNumber} = req.body;
        const existingUser = await User.findOne({where: {phoneNumber}});
        if (existingUser) {
            return reply.status(400).send({error: 'User already exists'});
        }else{
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
        }else{
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
        }else{
            await user.destroy();
            return reply.status(204).send();
        }
    });
}

module.exports = router;