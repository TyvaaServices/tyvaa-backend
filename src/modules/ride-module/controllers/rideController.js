import rideService from '../services/rideService.js';

const rideController = {
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

};

export default rideController;
