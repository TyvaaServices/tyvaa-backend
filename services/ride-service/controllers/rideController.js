// controllers/rideController.js
const axios = require('axios');
const ride = require('./../models/ride');

module.exports = {
    healthCheck: async (req, reply) => {
        return { status: 'ride-service running' };
    },

    getAllRides: async (req, reply) => {
        const rides = await ride.findAll();
        return reply.send({rides});
    },

    getRideById: async (req, reply) => {
        const {id} = req.params;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        return reply.send({rideDetails});
    },

    createRide: async (req, reply) => {
        const {driverId, departure, destination, dateTime, places, comment, price} = req.body;
        const rideDetails = await ride.create({driverId, departure, destination, dateTime, places, comment, price});
        return reply.status(201).send({rideDetails});
    },

    updateRide: async (req, reply) => {
        const {id} = req.params;
        const {driverId, departure, destination, dateTime, places, comment, price} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        await rideDetails.update({driverId, departure, destination, dateTime, places, comment, price});
        return reply.send({rideDetails});
    },

    deleteRide: async (req, reply) => {
        const {id} = req.params;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        await rideDetails.destroy();
        return reply.send({message: 'Ride deleted successfully'});
    },

    acceptRide: async (req, reply) => {
        const {id} = req.params;
        const {userId} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        try {
            const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                message: `Ride ${id} accepted by user ${userId}`
            });
            return reply.send({message: 'Ride accepted successfully', response});
        } catch (error) {
            return reply.status(500).send({error: 'Error notifying driver'});
        }
    },

    rejectRide: async (req, reply) => {
        const {id} = req.params;
        const {userId} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        try {
            const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                message: `Ride ${id} rejected by user ${userId}`
            });
            return reply.send({message: 'Ride rejected successfully', response});
        } catch (error) {
            return reply.status(500).send({error: 'Error notifying driver'});
        }
    },

    completeRide: async (req, reply) => {
        const {id} = req.params;
        const {userId} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        try {
            const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                message: `Ride ${id} completed by user ${userId}`
            });
            return reply.send({message: 'Ride completed successfully', response});
        } catch (error) {
            return reply.status(500).send({error: 'Error notifying driver'});
        }
    },

    rateRide: async (req, reply) => {
        const {id} = req.params;
        const {userId, rating} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        try {
            const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                message: `Ride ${id} rated by user ${userId} with rating ${rating}`
            });
            return reply.send({message: 'Ride rated successfully', response});
        } catch (error) {
            return reply.status(500).send({error: 'Error notifying driver'});
        }
    },

    reportRide: async (req, reply) => {
        const {id} = req.params;
        const {userId, reason} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        try {
            const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                message: `Ride ${id} reported by user ${userId} for reason: ${reason}`
            });
            return reply.send({message: 'Ride reported successfully', response});
        } catch (error) {
            return reply.status(500).send({error: 'Error notifying driver'});
        }
    },

    notifyRide: async (req, reply) => {
        const {id} = req.params;
        const {message} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        try {
            const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                message
            });
            return reply.send({message: 'Notification sent successfully', response});
        } catch (error) {
            return reply.status(500).send({error: 'Error notifying driver'});
        }
    }
};
