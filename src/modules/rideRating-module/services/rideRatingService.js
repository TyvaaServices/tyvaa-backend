const {RideRating} = require('./../../../config');
const createLogger = require('./../../../utils/logger');
const logger = createLogger('ride-rating-service');
const {fn, col} = require('sequelize');

const rideRatingService = {
    rateRide: async ({user, rideInstance, rating, comment}) => {
        if (!user) throw new Error('User instance required');
        if (!rideInstance) throw new Error('RideInstance required');
        let rideRating = await RideRating.findOne({ where: { userId: user.id, rideInstanceId: rideInstance.id } });
        if (rideRating) {
            await rideRating.update({ rating, comment });
        } else {
            rideRating = await RideRating.create({ rating, comment });
            await rideRating.setUser(user);
            await rideRating.setRideInstance(rideInstance);
        }
        const avg = await RideRating.findAll({
            where: { rideInstanceId: rideInstance.id },
            attributes: [[fn('AVG', col('rating')), 'avgRating']]
        });
        logger.info('Ride rated', rideRating.id);
        return { rideRating, avgRating: avg[0]?.get('avgRating') };
    },
};

module.exports = rideRatingService;

