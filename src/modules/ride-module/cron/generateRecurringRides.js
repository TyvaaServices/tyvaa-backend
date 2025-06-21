import {createRideDateTime, DAYS, generateDateRange} from './helpers/dateHelper.js';
import {checkRideInstanceExists, createRideInstance, fetchRecurringRides} from './helpers/rideDbHelper.js';
import {hasValidRecurrence, shouldOccurOnDay} from './helpers/validationHelper.js';
import createLogger from '../../../utils/logger.js';

const logger = createLogger('ride-cron');

/**
 * Processes a single ride to generate instances for valid recurrence days
 * @param {Object} ride - The ride to process
 * @param {Date[]} dateRange - Array of dates to check for ride creation
 */
async function processRide(ride, dateRange) {
    logger.info(`Processing ride id=${ride.id}, recurrence=${JSON.stringify(ride.recurrence)}`);

    if (!hasValidRecurrence(ride)) {
        return;
    }

    for (const date of dateRange) {
        const dayName = DAYS[date.getDay()];

        if (!shouldOccurOnDay(ride, dayName)) {
            continue;
        }

        const rideDate = createRideDateTime(date, ride.time);

        try {
            const exists = await checkRideInstanceExists(ride.id, rideDate);

            if (!exists) {
                await createRideInstance(ride, rideDate);
            }
        } catch (err) {
            logger.error(`Error processing ride id=${ride.id} for date ${rideDate}:`, err);
        }
    }
}

/**
 * Main function to generate recurring rides for the next two weeks
 */
async function generateRecurringRides() {
    try {
        const dateRange = generateDateRange();
        const recurringRides = await fetchRecurringRides();

        for (const ride of recurringRides) {
            await processRide(ride, dateRange);
        }

        logger.info('Completed generating recurring rides');
    } catch (err) {
        logger.error('Error in generateRecurringRides:', err);
        if (err.stack) logger.error(err.stack);
        throw err;
    }
}

export default generateRecurringRides;
