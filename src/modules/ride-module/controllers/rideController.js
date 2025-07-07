import rideFacade from "../facades/rideFacade.js";

/**
 * @file Handles HTTP requests for ride-related operations.
 */

const rideController = {
    /**
     * Retrieves all ride templates.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the list of rides.
     */
    getAllRides: async (req, reply) => {
        const rides = await rideFacade.getAllRides();
        return reply.send(rides);
    },

    /**
     * Retrieves a specific ride template by ID.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the ride or 404 error.
     */
    getRideById: async (req, reply) => {
        const ride = await rideFacade.getRideById(req.params.id);
        if (!ride) return reply.code(404).send({ error: "Ride not found" });
        return reply.send(ride);
    },

    /**
     * Creates a new ride template.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the created ride with 201 status.
     */
    createRide: async (req, reply) => {
        const ride = await rideFacade.createRide(req.body);
        return reply.code(201).send(ride);
    },

    /**
     * Updates an existing ride template.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the updated ride or 404 error.
     */
    updateRide: async (req, reply) => {
        const ride = await rideFacade.updateRide(req.params.id, req.body);
        if (!ride) return reply.code(404).send({ error: "Ride not found" });
        return reply.send(ride);
    },

    /**
     * Deletes a ride template.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends success message or 404 error.
     */
    deleteRide: async (req, reply) => {
        const deleted = await rideFacade.deleteRide(req.params.id);
        if (!deleted) return reply.code(404).send({ error: "Ride not found" });
        return reply.send({ message: "Ride deleted" });
    },

    /**
     * Retrieves all ride instances.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the list of ride instances.
     */
    getAllRideInstances: async (req, reply) => {
        const instances = await rideFacade.getAllRideInstances();
        return reply.send(instances);
    },

    /**
     * Retrieves a specific ride instance by ID.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the ride instance or 404 error.
     */
    getRideInstanceById: async (req, reply) => {
        const instance = await rideFacade.getRideInstanceById(req.params.id);
        if (!instance)
            return reply.code(404).send({ error: "RideInstance not found" });
        return reply.send(instance);
    },

    /**
     * Creates a new ride instance.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the created ride instance with 201 status.
     */
    createRideInstance: async (req, reply) => {
        const instance = await rideFacade.createRideInstance(req.body);
        return reply.code(201).send(instance);
    },

    /**
     * Updates an existing ride instance.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the updated ride instance or 404 error.
     */
    updateRideInstance: async (req, reply) => {
        const instance = await rideFacade.updateRideInstance(
            req.params.id,
            req.body
        );
        if (!instance)
            return reply.code(404).send({ error: "RideInstance not found" });
        return reply.send(instance);
    },

    /**
     * Deletes a ride instance.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends success message or 404 error.
     */
    deleteRideInstance: async (req, reply) => {
        const deleted = await rideFacade.deleteRideInstance(req.params.id);
        if (!deleted)
            return reply.code(404).send({ error: "RideInstance not found" });
        return reply.send({ message: "RideInstance deleted" });
    },

    /**
     * Retrieves available rides for passengers (optimized query).
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the list of available rides.
     */
    getAvailableRides: async (req, reply) => {
        const rides = await rideFacade.getAvailableRides();
        return reply.send(rides);
    },

    /**
     * Accepts a ride request.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends success message or 404 error.
     */
    acceptRide: async (req, reply) => {
        const accepted = await rideFacade.acceptRide(req.params.id);
        if (!accepted) return reply.code(404).send({ error: "Ride not found" });
        return reply.send({ message: "Ride accepted" });
    },

    /**
     * Rejects a ride request.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends success message or 404 error.
     */
    rejectRide: async (req, reply) => {
        const rejected = await rideFacade.rejectRide(req.params.id);
        if (!rejected) return reply.code(404).send({ error: "Ride not found" });
        return reply.send({ message: "Ride rejected" });
    },

    /**
     * Marks a ride as completed.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends success message or 404 error.
     */
    completeRide: async (req, reply) => {
        const completed = await rideFacade.completeRide(req.params.id);
        if (!completed)
            return reply.code(404).send({ error: "Ride not found" });
        return reply.send({ message: "Ride completed" });
    },

    /**
     * Searches ride instances by departure, destination, and optional date.
     * @param {import("fastify").FastifyRequest} req - The Fastify request object.
     * @param {import("fastify").FastifyReply} reply - The Fastify reply object.
     * @returns {Promise<void>} Sends the list of matching ride instances.
     */
    searchRideInstanceByDepartureAndDestination: async (req, reply) => {
        const { departure, destination, date } = req.query;
        if (!departure) {
            return reply.code(400).send({
                error: "departure and destination/arrival are required",
            });
        }
        const rides =
            await rideFacade.searchRideInstanceByDepartureAndDestination(
                departure,
                destination,
                date
            );
        return reply.send(rides);
    },
    getAllLandmarks: async (req, reply) => {
        const landmarks = await rideFacade.getAllLandmarks();
        return reply.send(landmarks);
    },
};

export default rideController;
