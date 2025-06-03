const {Booking, RideInstance, RideModel, RideRating} = require('../models');
const logger = require('../utils/logger');

const rideService = {
    // RIDE CRUD
    getAllRides: async () => {
        return RideModel.findAll();
    },
    getRideById: async (id) => {
        return RideModel.findByPk(id);
    },
    createRide: async (data) => {
        const ride = await RideModel.create(data);
        logger.info('Ride created', ride.id);
        // Automatically create RideInstance for non-recurrent rides
        if (!ride.isRecurring && ride.startDate && ride.time) {
            const rideDateTime = new Date(`${ride.startDate}T${ride.time}`);
            await RideInstance.create({
                rideId: ride.id,
                rideDate: rideDateTime,
                seatsAvailable: ride.seatsAvailable,
                status: 'scheduled',
            });
            logger.info('RideInstance automatically created for non-recurrent ride', ride.id);
        }
        return ride;
    },
    updateRide: async (id, data) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.update(data);
        logger.info('Ride updated', ride.id);
        return ride;
    },
    deleteRide: async (id) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.destroy();
        logger.info('Ride deleted', ride.id);
        return true;
    },

    getAllRideInstances: async () => {
        return RideInstance.findAll();
    },
    getRideInstanceById: async (id) => {
        return RideInstance.findByPk(id);
    },
    createRideInstance: async (data) => {
        const instance = await RideInstance.create(data);
        logger.info('RideInstance created', instance.id);
        return instance;
    },
    updateRideInstance: async (id, data) => {
        const instance = await RideInstance.findByPk(id);
        if (!instance) return null;
        await instance.update(data);
        logger.info('RideInstance updated', instance.id);
        return instance;
    },
    deleteRideInstance: async (id) => {
        const instance = await RideInstance.findByPk(id);
        if (!instance) return null;
        await instance.destroy();
        logger.info('RideInstance deleted', instance.id);
        return true;
    },

    // BOOKING CRUD & LOGIC
    getAllBookings: async () => {
        return Booking.findAll();
    },
    getBookingById: async (id) => {
        return Booking.findByPk(id);
    },
    updateBooking: async (id, data) => {
        const booking = await Booking.findByPk(id);
        if (!booking) return null;
        await booking.update(data);
        logger.info('Booking updated', booking.id);
        return booking;
    },
    deleteBooking: async (id) => {
        const booking = await Booking.findByPk(id);
        if (!booking) return null;
        await booking.destroy();
        logger.info('Booking deleted', booking.id);
        return true;
    },
    bookRide: async ({userId, rideInstanceId, seatsToBook}) => {
        const rideInstance = await RideInstance.findByPk(rideInstanceId);
        if (!rideInstance) throw new Error('RideInstance not found');
        const availableSeats = rideInstance.seatsAvailable - rideInstance.seatsBooked;
        if (seatsToBook > availableSeats) throw new Error('Not enough seats available');
        const existing = await Booking.findOne({where: {userId, rideInstanceId}});
        if (existing) throw new Error('Already booked');
        const booking = await Booking.create({userId, rideInstanceId, seatsBooked: seatsToBook, status: 'booked'});
        await rideInstance.increment('seatsBooked', {by: seatsToBook});
        logger.info('Ride booked', booking.id);
        return booking;
    },
    cancelBooking: async (bookingId) => {
        const booking = await Booking.findByPk(bookingId);
        if (!booking || booking.status === 'cancelled') return null;
        const rideInstance = await RideInstance.findByPk(booking.rideInstanceId);
        await booking.update({status: 'cancelled'});
        await rideInstance.decrement('seatsBooked', {by: booking.seatsBooked});
        logger.info('Booking cancelled', booking.id);
        return true;
    },

    acceptRide: async (id) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.update({status: 'active'});
        logger.info('Ride accepted', ride.id);
        return true;
    },
    rejectRide: async (id) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.update({status: 'cancelled'});
        logger.info('Ride rejected', ride.id);
        return true;
    },
    completeRide: async (id) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.update({status: 'completed'});
        logger.info('Ride completed', ride.id);
        return true;
    },

    // Ride rating
    rateRide: async ({userId, rideInstanceId, rating, comment}) => {
        // Check if ride instance exists
        const rideInstance = await RideInstance.findByPk(rideInstanceId);
        if (!rideInstance) throw new Error('RideInstance not found');
        // Upsert rating
        const [rideRating, created] = await RideRating.upsert({
            userId,
            rideInstanceId,
            rating,
            comment
        }, {returning: true, conflictFields: ['userId', 'rideInstanceId']});
        // Optionally, return average rating for the ride instance
        const avg = await RideRating.findAll({
            where: {rideInstanceId},
            attributes: [[require('sequelize').fn('AVG', require('sequelize').col('rating')), 'avgRating']]
        });
        return {rideRating, average: avg[0]?.dataValues?.avgRating};
    },

    // Ride reporting (stub)
    reportRide: async (id) => {
        logger.info('Ride reported', id);
        return true;
    },
    // Ride notification (stub)
    notifyRide: async (id) => {
        logger.info('Ride notification sent', id);
        return true;
    },
};

module.exports = rideService;

