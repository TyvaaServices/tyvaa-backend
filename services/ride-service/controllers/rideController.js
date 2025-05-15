// controllers/rideController.js
const axios = require('axios');
const ride = require('./../models/ride');
const rideParticipant = require('./../models/rideParticipant');
const logger = require('./../utils/logger');

module.exports = {
    healthCheck: async (req, reply) => {
        return {status: 'ride-service running'};
    },

    getAllRides: async (req, reply) => {
        try {
            logger.info('Requete pour recuperer tous les trajets');
            const rides = await ride.findAll();
            logger.info(`${rides.length} trajets trouves`);
            return reply.send({rides});
        } catch (error) {
            logger.error('Erreur lors de la recuperation des trajets:', error);
            return reply.status(500).send({error: 'Erreur interne du serveur'});
        }
    },


    getRideById: async (req, reply) => {
        try {
            const {id} = req.params;
            logger.info(`Requête pour récupérer le trajet avec l'id: ${id}`);

            const rideDetails = await ride.findByPk(id);

            if (!rideDetails) {
                logger.warn(`Aucun trajet trouvé avec l'id: ${id}`);
                return reply.status(404).send({error: 'Ride not found'});
            }

            logger.info(`Trajet trouvé: ${JSON.stringify(rideDetails)}`);
            return reply.send({rideDetails});
        } catch (error) {
            logger.error(`Erreur lors de la récupération du trajet avec l'id ${req.params.id}:`, error);
            return reply.status(500).send({error: 'Erreur interne du serveur'});
        }
    },


    createRide: async (req, reply) => {
        try {
            const {driverId, departure, destination, dateTime, places, comment, price} = req.body;
            logger.info('Requete pour creer un nouveau trajet');
            const rideDetails = await ride.create({driverId, departure, destination, dateTime, places, comment, price});
            logger.info(`Trajet créé avec succès: ${JSON.stringify(rideDetails)}`);
            return reply.status(201).send({rideDetails});
        } catch (error) {
            logger.error('Erreur lors de la creation du trajet:', error);
            return reply.status(500).send({error: 'Erreur interne du serveur'});
        }
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

    bookRide: async (req, reply) => {
        const {id} = req.params;
        const {userId} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        }
        try {
            const rideParticipantDetails = await rideParticipant.create({rideId: id, userId});
            const response = await axios.get(`http://user-service:2003/users/${rideDetails.driverId}`);
            if (!response.data) {
                return reply.status(404).send({error: 'Driver not found'});
            }
            const driverDetails = response.data;
            const notificationResponse = await axios.post(`http://notification-service:2004/send-notification`, {
                token: driverDetails.fcmToken,
                title: 'New Ride Booking',
                body: `User ${userId} has booked your ride from ${rideDetails.departure} to ${rideDetails.destination}.`,
                data: {
                    type: 'ride_booking',
                    rideId: id,
                    userId
                }
            });
            if (notificationResponse.status !== 200) {
                logger.error(`Failed to send notification to driver ${rideDetails.driverId}: ${notificationResponse.statusText}`);
                return reply.status(500).send({error: 'Error sending notification'});
            }
            logger.info(`Notification sent to driver ${rideDetails.driverId} for ride ${id}`);
            logger.info(`Ride booked successfully by user ${userId} for ride ${id}`);
            return reply.send({message: 'Ride booked successfully', rideParticipantDetails, response});
        } catch (e) {
            logger.error(`Error booking ride ${id} for user ${userId}: ${e.message}`);
            return reply.status(500).send({error: 'Error booking ride'});
        }
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
