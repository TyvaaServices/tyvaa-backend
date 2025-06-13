const RideRating = require('../services/rideRatingService');
const { User,RideInstance } = require('./../../../config/index');

module.exports = {
    rateRide: async (req, reply) => {
        try {
            const { userId, rating, comment } = req.body;
            const rideInstanceId = req.params.id;
            const user = await User.findByPk(userId);
            if (!user) return reply.code(404).send({ error: 'User not found' });
            const rideInstance = await RideInstance.findByPk(rideInstanceId);
            if (!rideInstance) return reply.code(404).send({ error: 'RideInstance not found' });
            const result = await RideRating.rateRide({ user, rideInstance, rating, comment });
            return reply.send({ message: 'Ride rated', rating: result.rideRating, average: result.avgRating });
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    },

    reportRide: async (req, reply) => {
        await RideRating.reportRide(req.params.id);
        return reply.send({message: 'Ride reported (stub)'});
    },

    notifyRide: async (req, reply) => {
        await RideRating.notifyRide(req.params.id);
        return reply.send({message: 'Ride notification sent (stub)'});
    },
};
