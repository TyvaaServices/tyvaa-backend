import createLogger from '../../../../utils/logger.js';

const logger = createLogger('ride-date-helper');

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Generates dates for the next two weeks
 * @returns {Date[]} Array of dates for the next two weeks
 */
export function generateDateRange() {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 14);

    const dates = [];
    for (let d = new Date(now); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
    }

    return dates;
}

/**
 * Creates a ride date with proper time from a day and ride time
 * @param {Date} day - The day to set the time for
 * @param {string} timeString - Time in HH:MM:SS format
 * @returns {Date} Date with time set
 */
export function createRideDateTime(day, timeString) {
    const rideDate = new Date(day);

    if (timeString) {
        const [h, m, s] = timeString.split(':');
        rideDate.setHours(Number(h), Number(m), Number(s || 0), 0);
    }

    return rideDate;
}
