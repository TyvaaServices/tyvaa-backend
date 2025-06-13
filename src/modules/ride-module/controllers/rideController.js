const rideService = require('../services/rideService');
const { User,RideInstance } = require('./../../../config/index');

module.exports = {
    healthCheck: async (req, reply) => {
        return {status: 'ride-service running'};
    },


    //TODO uncomment this when driver authentication is implemented
    //     if (!req.user?.isDriver) {
    //     return reply.code(403).send({ error: 'Driver access required' });
    // }

    getAllRides: async (req, reply) => {
        const rides = await rideService.getAllRides();
        return reply.send(rides);
    },
    getRideById: async (req, reply) => {
        const ride = await rideService.getRideById(req.params.id);
        if (!ride) return reply.code(404).send({error: 'Ride not found'});
        return reply.send(ride);
    },
    createRide: async (req, reply) => {
        const ride = await rideService.createRide(req.body);
        return reply.code(201).send(ride);
    },
    updateRide: async (req, reply) => {
        const ride = await rideService.updateRide(req.params.id, req.body);
        if (!ride) return reply.code(404).send({error: 'Ride not found'});
        return reply.send(ride);
    },
    deleteRide: async (req, reply) => {
        const deleted = await rideService.deleteRide(req.params.id);
        if (!deleted) return reply.code(404).send({error: 'Ride not found'});
        return reply.send({message: 'Ride deleted'});
    },

    // RIDE INSTANCE CRUD
    getAllRideInstances: async (req, reply) => {
        const instances = await rideService.getAllRideInstances();
        return reply.send(instances);
    },
    getRideInstanceById: async (req, reply) => {
        const instance = await rideService.getRideInstanceById(req.params.id);
        if (!instance) return reply.code(404).send({error: 'RideInstance not found'});
        return reply.send(instance);
    },
    createRideInstance: async (req, reply) => {
        const instance = await rideService.createRideInstance(req.body);
        return reply.code(201).send(instance);
    },
    updateRideInstance: async (req, reply) => {
        const instance = await rideService.updateRideInstance(req.params.id, req.body);
        if (!instance) return reply.code(404).send({error: 'RideInstance not found'});
        return reply.send(instance);
    },
    deleteRideInstance: async (req, reply) => {
        const deleted = await rideService.deleteRideInstance(req.params.id);
        if (!deleted) return reply.code(404).send({error: 'RideInstance not found'});
        return reply.send({message: 'RideInstance deleted'});
    },

    // BOOKING CRUD & LOGIC
    getAllBookings: async (req, reply) => {
        const bookings = await rideService.getAllBookings();
        return reply.send(bookings);
    },
    getBookingById: async (req, reply) => {
        const booking = await rideService.getBookingById(req.params.id);
        if (!booking) return reply.code(404).send({error: 'Booking not found'});
        return reply.send(booking);
    },
    createBooking: async (req, reply) => {
        try {
            const booking = await rideService.createBooking(req.body);
            return reply.code(201).send(booking);
        } catch (err) {
            return reply.code(400).send({error: err.message});
        }
    },
    updateBooking: async (req, reply) => {
        const booking = await rideService.updateBooking(req.params.id, req.body);
        if (!booking) return reply.code(404).send({error: 'Booking not found'});
        return reply.send(booking);
    },
    deleteBooking: async (req, reply) => {
        const deleted = await rideService.deleteBooking(req.params.id);
        if (!deleted) return reply.code(404).send({error: 'Booking not found'});
        return reply.send({message: 'Booking deleted'});
    },
    bookRide: async (req, reply) => {
        try {
            const { userId, rideInstanceId, seatsToBook } = req.body;
            const user = await User.findByPk(userId);
            if (!user) return reply.code(404).send({ error: 'User not found' });
            const rideInstance = await RideInstance.findByPk(rideInstanceId);
            if (!rideInstance) return reply.code(404).send({ error: 'RideInstance not found' });
            const booking = await rideService.bookRide({ user, rideInstance, seatsToBook });
            return reply.code(201).send(booking);
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    },
    cancelBooking: async (req, reply) => {
        const cancelled = await rideService.cancelBooking(req.params.bookingId);
        if (!cancelled) return reply.code(404).send({error: 'Booking not found or already cancelled'});
        return reply.send({message: 'Booking cancelled'});
    },

    acceptRide: async (req, reply) => {
        const accepted = await rideService.acceptRide(req.params.id);
        if (!accepted) return reply.code(404).send({error: 'Ride not found'});
        return reply.send({message: 'Ride accepted'});
    },
    rejectRide: async (req, reply) => {
        const rejected = await rideService.rejectRide(req.params.id);
        if (!rejected) return reply.code(404).send({error: 'Ride not found'});
        return reply.send({message: 'Ride rejected'});
    },
    completeRide: async (req, reply) => {
        const completed = await rideService.completeRide(req.params.id);
        if (!completed) return reply.code(404).send({error: 'Ride not found'});
        return reply.send({message: 'Ride completed'});
    },

    // Ride rating
    rateRide: async (req, reply) => {
        try {
            const { userId, rating, comment } = req.body;
            const rideInstanceId = req.params.id;
            const user = await User.findByPk(userId);
            if (!user) return reply.code(404).send({ error: 'User not found' });
            const rideInstance = await RideInstance.findByPk(rideInstanceId);
            if (!rideInstance) return reply.code(404).send({ error: 'RideInstance not found' });
            const result = await rideService.rateRide({ user, rideInstance, rating, comment });
            return reply.send({ message: 'Ride rated', rating: result.rideRating, average: result.avgRating });
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    },

    reportRide: async (req, reply) => {
        await rideService.reportRide(req.params.id);
        return reply.send({message: 'Ride reported (stub)'});
    },

    notifyRide: async (req, reply) => {
        await rideService.notifyRide(req.params.id);
        return reply.send({message: 'Ride notification sent (stub)'});
    },
};
