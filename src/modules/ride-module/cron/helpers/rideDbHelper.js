import {RideInstance, RideModel} from '../../../../config/index.js';
import createLogger from '../../../../utils/logger.js';

const logger = createLogger('ride-db-helper');

/**
 * Fetches all active recurring rides
 * @returns {Promise<Array>} List of recurring rides
 */
export async function fetchRecurringRides() {
    try {
        const recurringRides = await RideModel.findAll({
            where: {isRecurring: true, status: 'active'}
        });
        logger.info(`Found ${recurringRides.length} recurring rides`);
        return recurringRides;
    } catch (err) {
        logger.error('Error fetching recurring rides:', err);
        throw err;
    }
}

/**
 * Checks if a ride instance already exists for the given ride and date
 * @param {number} rideId - The ride ID
 * @param {Date} rideDate - The ride date
 * @returns {Promise<boolean>} True if the ride instance exists
 */
export async function checkRideInstanceExists(rideId, rideDate) {
    try {
        logger.info(`Checking for duplicate: rideId=${rideId}, rideDate=${rideDate.toISOString()}`);
        const exists = await RideInstance.findOne({
            where: {
                rideId: rideId,
                rideDate: rideDate,
            },
        });
        return !!exists;
    } catch (err) {
        logger.error(`Error checking ride instance existence for rideId=${rideId}:`, err);
        throw err;
    }
}

/**
 * Creates a new ride instance
 * @param {Object} ride - The parent ride
 * @param {Date} rideDate - The date for the ride instance
 * @returns {Promise<Object>} The created ride instance
 */
export async function createRideInstance(ride, rideDate) {
    try {
        logger.info(`Creating RideInstance for rideId=${ride.id} on ${rideDate.toISOString()}`);
        const instance = await RideInstance.create({
            rideId: ride.id,
            rideDate: rideDate,
            seatsAvailable: ride.seatsAvailable,
            seatsBooked: 0,
            status: 'scheduled',
        });
        logger.info(`Generated ride instance for rideId=${ride.id} on ${rideDate}`);
        return instance;
    } catch (err) {
        logger.error(`Error creating RideInstance for rideId=${ride.id} on ${rideDate}:`, err);
        throw err;
    }
}
