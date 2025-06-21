import createLogger from '../../../../utils/logger.js';

const logger = createLogger('ride-validation-helper');

/**
 * Validates that a ride has valid recurrence data
 * @param {Object} ride - The ride to validate
 * @returns {boolean} True if the ride has valid recurrence data
 */
export function hasValidRecurrence(ride) {
    if (!ride.recurrence || !Array.isArray(ride.recurrence)) {
        logger.warn(`Ride id=${ride.id} has no valid recurrence array.`);
        return false;
    }
    return true;
}

/**
 * Checks if a ride should occur on a specific day
 * @param {Object} ride - The ride to check
 * @param {string} dayName - The name of the day (e.g., 'Monday')
 * @returns {boolean} True if the ride should occur on this day
 */
export function shouldOccurOnDay(ride, dayName) {
    return ride.recurrence.includes(dayName);
}
