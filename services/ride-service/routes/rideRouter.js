const axios = require('axios');

const router = function (fastify,opts){
  const ride = require('./../model/ride');
    fastify.get('/health', async (req, reply) => {
        return {status: 'ride-service running'};
    });

    fastify.get('/rides', async (req, reply) => {
        const rides = await ride.findAll();
        return reply.send({rides});
    });

    fastify.get('/rides/:id', async (req, reply) => {
        const {id} = req.params;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            return reply.send({rideDetails});
        }
    });

    fastify.post('/rides', async (req, reply) => {
        const {driverId, departure, destination, dateTime, places, comment, price} = req.body;
        const rideDetails = await ride.create({driverId, departure, destination, dateTime, places, comment, price});
        return reply.status(201).send({rideDetails});
    });
    fastify.put('/rides/:id', async (req, reply) => {
        const {id} = req.params;
        const {driverId, departure, destination, dateTime, places, comment, price} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            await rideDetails.update({driverId, departure, destination, dateTime, places, comment, price});
            return reply.send({rideDetails});
        }
    });

    fastify.delete('/rides/:id', async (req, reply) => {
        const {id} = req.params;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            await rideDetails.destroy();
            return reply.send({message: 'Ride deleted successfully'});
        }
    });

    fastify.post('/rides/:id/accept', async (req, reply) => {
        const {id} = req.params;
        const {userId} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            // Notify the driver about the acceptance
            try {
                const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                    message: `Ride ${id} accepted by user ${userId}`
                });
                return reply.send({message: 'Ride accepted successfully', response});
            } catch (error) {
                return reply.status(500).send({error: 'Error notifying driver'});
            }
        }
    });

    fastify.post('/rides/:id/reject', async (req, reply) => {
        const {id} = req.params;
        const {userId} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            // Notify the driver about the rejection
            try {
                const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                    message: `Ride ${id} rejected by user ${userId}`
                });
                return reply.send({message: 'Ride rejected successfully', response});
            } catch (error) {
                return reply.status(500).send({error: 'Error notifying driver'});
            }
        }
    });

    fastify.post('/rides/:id/complete', async (req, reply) => {
        const {id} = req.params;
        const {userId} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            // Notify the driver about the completion
            try {
                const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                    message: `Ride ${id} completed by user ${userId}`
                });
                return reply.send({message: 'Ride completed successfully', response});
            } catch (error) {
                return reply.status(500).send({error: 'Error notifying driver'});
            }
        }
    });

    fastify.post('/rides/:id/rate', async (req, reply) => {
        const {id} = req.params;
        const {userId, rating} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            // Notify the driver about the rating
            try {
                const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                    message: `Ride ${id} rated by user ${userId} with rating ${rating}`
                });
                return reply.send({message: 'Ride rated successfully', response});
            } catch (error) {
                return reply.status(500).send({error: 'Error notifying driver'});
            }
        }
    });

    fastify.post('/rides/:id/report', async (req, reply) => {
        const {id} = req.params;
        const {userId, reason} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            // Notify the driver about the report
            try {
                const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                    message: `Ride ${id} reported by user ${userId} for reason: ${reason}`
                });
                return reply.send({message: 'Ride reported successfully', response});
            } catch (error) {
                return reply.status(500).send({error: 'Error notifying driver'});
            }
        }
    });

    fastify.post('/rides/:id/notify', async (req, reply) => {
        const {id} = req.params;
        const {message} = req.body;
        const rideDetails = await ride.findByPk(id);
        if (!rideDetails) {
            return reply.status(404).send({error: 'Ride not found'});
        } else {
            // Notify the driver about the message
            try {
                const response = await axios.post(`http://user-service:2003/users/${rideDetails.driverId}/notify`, {
                    message
                });
                return reply.send({message: 'Notification sent successfully', response});
            } catch (error) {
                return reply.status(500).send({error: 'Error notifying driver'});
            }
        }
    });
}

module.exports = router;