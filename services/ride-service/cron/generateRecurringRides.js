const {Op} = require('sequelize');
const {RideModel, RideInstance} = require('../models');
const logger = require('../utils/logger');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function generateRecurringRides() {
    try {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + 14);

        const recurringRides = await RideModel.findAll({where: {isRecurring: true, status: 'active'}});
        logger.info(`Found ${recurringRides.length} recurring rides`);

        for (const ride of recurringRides) {
            logger.info(`Processing RideModel id=${ride.id}, recurrence=${JSON.stringify(ride.recurrence)}`);
            if (!ride.recurrence || !Array.isArray(ride.recurrence)) {
                logger.warn(`RideModel id=${ride.id} has no valid recurrence array.`);
                continue;
            }
            for (let d = new Date(now); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayName = DAYS[d.getDay()];
                if (!ride.recurrence.includes(dayName)) continue;
                let rideDate = new Date(d);
                if (ride.time) {
                    const [h, m, s] = ride.time.split(':');
                    rideDate.setHours(Number(h), Number(m), Number(s || 0), 0);
                }
                logger.info(`Checking for duplicate: rideId=${ride.id}, rideDate=${rideDate.toISOString()}`);
                try {
                    const exists = await RideInstance.findOne({
                        where: {
                            rideId: ride.id,
                            rideDate: rideDate,
                        },
                    });
                    if (!exists) {
                        logger.info(`Creating RideInstance for rideId=${ride.id} on ${rideDate.toISOString()}`);
                        await RideInstance.create({
                            rideId: ride.id,
                            rideDate: rideDate,
                            seatsAvailable: ride.seatsAvailable,
                            seatsBooked: 0,
                            status: 'scheduled',
                        });
                        logger.info(`Generated ride instance for rideId=${ride.id} on ${rideDate}`);
                    }
                } catch (err) {
                    logger.error(`Error checking/creating RideInstance for rideId=${ride.id} on ${rideDate}:`, err);
                }
            }
        }
    } catch (err) {
        logger.error('Error in generateRecurringRides root:', err);
        if (err.stack) logger.error(err.stack);
        throw err;
    }
}

module.exports = generateRecurringRides;

