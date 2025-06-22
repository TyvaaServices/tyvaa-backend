import { RideInstance, RideModel } from '../../../config/index.js';
import createLogger from '../../../utils/logger.js';

const logger = createLogger('ride-cron');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const LOOKAHEAD_DAYS = 14;

/** Get all recurring, active rides */
async function getRecurringRides() {
    return await RideModel.findAll({
        where: {
            isRecurring: true,
            status: 'active',
        },
    });
}

/** Get list of dates from today to today + LOOKAHEAD_DAYS */
function getUpcomingDates() {
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= LOOKAHEAD_DAYS; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
    }
    return dates;
}

/** Check if ride should occur on this date based on recurrence */
function shouldGenerateRideForDay(ride, date) {
    if (!Array.isArray(ride.recurrence)) return false;
    const dayName = DAYS[date.getDay()];
    return ride.recurrence.includes(dayName);
}

/** Build ride datetime with time if available */
function buildRideDateTime(ride, date) {
    const rideDate = new Date(date);
    if (ride.time) {
        const [hours, minutes, seconds = '0'] = ride.time.split(':');
        rideDate.setHours(Number(hours), Number(minutes), Number(seconds), 0);
    } else {
        rideDate.setHours(0, 0, 0, 0);
    }
    return rideDate;
}

/** Create a ride instance if one doesn't already exist */
async function createRideInstanceIfNotExists(ride, rideDate) {
    const exists = await RideInstance.findOne({
        where: {
            rideId: ride.id,
            rideDate,
        },
    });

    if (!exists) {
        logger.info(`Creating RideInstance for rideId=${ride.id} on ${rideDate.toISOString()}`);
        await RideInstance.create({
            rideId: ride.id,
            rideDate,
            seatsAvailable: ride.seatsAvailable,
            seatsBooked: 0,
            status: 'scheduled',
        });
        logger.info(`RideInstance created for rideId=${ride.id}`);
    }
}

/** Main function to generate ride instances */
async function generateRecurringRides() {
    try {
        const rides = await getRecurringRides();
        const upcomingDates = getUpcomingDates();

        logger.info(`Found ${rides.length} recurring rides`);

        for (const ride of rides) {
            logger.info(`Processing rideId=${ride.id} with recurrence=${JSON.stringify(ride.recurrence)}`);

            if (!Array.isArray(ride.recurrence)) {
                logger.warn(`Skipping rideId=${ride.id} due to invalid recurrence`);
                continue;
            }

            for (const date of upcomingDates) {
                if (!shouldGenerateRideForDay(ride, date)) continue;

                const rideDateTime = buildRideDateTime(ride, date);

                try {
                    await createRideInstanceIfNotExists(ride, rideDateTime);
                } catch (err) {
                    logger.error(`Error creating ride instance for rideId=${ride.id} on ${rideDateTime.toISOString()}`, err);
                }
            }
        }
    } catch (err) {
        logger.error('Error generating recurring rides:', err);
        if (err.stack) logger.error(err.stack);
        throw err;
    }
}

export default generateRecurringRides;
