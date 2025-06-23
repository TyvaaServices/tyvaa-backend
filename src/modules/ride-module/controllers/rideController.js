import rideFacade from '../facades/rideFacade.js';

const rideController = {
    getAllRides: async (req, reply) => {
        const rides = await rideFacade.getAllRides();
        return reply.send(rides);
    },
    getRideById: async (req, reply) => {
        const ride = await rideFacade.getRideById(req.params.id);
        if (!ride) return reply.code(404).send({error: 'Ride not found'});
        return reply.send(ride);
    },
    createRide: async (req, reply) => {
        const ride = await rideFacade.createRide(req.body);
        return reply.code(201).send(ride);
    },
    updateRide: async (req, reply) => {
        const ride = await rideFacade.updateRide(req.params.id, req.body);
        if (!ride) return reply.code(404).send({error: 'Ride not found'});
        return reply.send(ride);
    },
    deleteRide: async (req, reply) => {
        const deleted = await rideFacade.deleteRide(req.params.id);
        if (!deleted) return reply.code(404).send({error: 'Ride not found'});
        return reply.send({message: 'Ride deleted'});
    },

    // RIDE INSTANCE CRUD
    getAllRideInstances: async (req, reply) => {
        const instances = await rideFacade.getAllRideInstances();
        return reply.send(instances);
    },
    getRideInstanceById: async (req, reply) => {
        const instance = await rideFacade.getRideInstanceById(req.params.id);
        if (!instance) return reply.code(404).send({error: 'RideInstance not found'});
        return reply.send(instance);
    },
    createRideInstance: async (req, reply) => {
        const instance = await rideFacade.createRideInstance(req.body);
        return reply.code(201).send(instance);
    },
    updateRideInstance: async (req, reply) => {
        const instance = await rideFacade.updateRideInstance(req.params.id, req.body);
        if (!instance) return reply.code(404).send({error: 'RideInstance not found'});
        return reply.send(instance);
    },
    deleteRideInstance: async (req, reply) => {
        const deleted = await rideFacade.deleteRideInstance(req.params.id);
        if (!deleted) return reply.code(404).send({error: 'RideInstance not found'});
        return reply.send({message: 'RideInstance deleted'});
    },


    acceptRide: async (req, reply) => {
        const accepted = await rideFacade.acceptRide(req.params.id);
        if (!accepted) return reply.code(404).send({error: 'Ride not found'});
        return reply.send({message: 'Ride accepted'});
    },
    rejectRide: async (req, reply) => {
        const rejected = await rideFacade.rejectRide(req.params.id);
        if (!rejected) return reply.code(404).send({error: 'Ride not found'});
        return reply.send({message: 'Ride rejected'});
    },
    completeRide: async (req, reply) => {
        const completed = await rideFacade.completeRide(req.params.id);
        if (!completed) return reply.code(404).send({error: 'Ride not found'});
        return reply.send({message: 'Ride completed'});
    },

};

export default rideController;
