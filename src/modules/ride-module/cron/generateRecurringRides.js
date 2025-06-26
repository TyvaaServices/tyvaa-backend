import { RideInstance, RideModel } from "../../../config/index.js";
import createLogger from "../../../utils/logger.js";

const logger = createLogger("ride-cron-service"); // More specific logger name

const DAYS_OF_WEEK = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const RIDE_INSTANCE_GENERATION_LOOKAHEAD_DAYS = parseInt(
    process.env.RIDE_LOOKAHEAD_DAYS || "14",
    10
);

/**
 * @file Cron job logic for generating RideInstance records from recurring RideModels.
 */

/**
 * @typedef {import("../models/rideModel.js").RideModelAttributes} RideModelAttributes
 */

/**
 * Fetches all active, recurring ride models (templates) from the database.
 * @async
 * @returns {Promise<RideModelAttributes[]>} A list of recurring ride models.
 */
async function getActiveRecurringRideModels() {
    logger.debug("Fetching active recurring ride models...");
    return RideModel.findAll({
        where: {
            isRecurring: true,
            status: "active",
        },
    });
}

/**
 * Generates a list of dates from today up to a defined lookahead period.
 * @returns {Date[]} An array of Date objects.
 */
function getUpcomingDatesForInstanceGeneration() {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the start of today

    for (let i = 0; i <= RIDE_INSTANCE_GENERATION_LOOKAHEAD_DAYS; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
    }
    logger.debug(
        `Generating for dates: ${dates.map((d) => d.toISOString().split("T")[0]).join(", ")}`
    );
    return dates;
}

/**
 * Checks if a ride instance should be generated for a given ride model on a specific date,
 * based on the ride's recurrence rules (e.g., specific days of the week).
 * @param {RideModelAttributes} rideModel - The ride model containing recurrence rules.
 * @param {Date} date - The specific date to check.
 * @returns {boolean} True if a ride instance should be generated, false otherwise.
 */
function shouldGenerateInstanceForDate(rideModel, date) {
    if (
        !Array.isArray(rideModel.recurrence) ||
        rideModel.recurrence.length === 0
    ) {
        // If no specific recurrence days, it might be a different type of recurring ride (e.g., daily, not handled here)
        // or this function assumes weekday recurrence. For this logic, we'll say false if no days.
        return false;
    }
    const dayName = DAYS_OF_WEEK[date.getDay()];
    return rideModel.recurrence.includes(dayName);
}

/**
 * Constructs the specific departure date and time for a ride instance.
 * It combines the given date with the time specified in the ride model.
 * @param {RideModelAttributes} rideModel - The ride model containing the departure time.
 * @param {Date} date - The date for which the ride instance is being generated.
 * @returns {Date} The full Date object representing the ride instance's departure.
 */
function buildInstanceDepartureDateTime(rideModel, date) {
    const rideDateTime = new Date(date); // Clones the date part
    if (rideModel.time) {
        // Format HH:MM:SS
        const [hours, minutes, seconds = "0"] = rideModel.time.split(":");
        rideDateTime.setHours(
            Number(hours),
            Number(minutes),
            Number(seconds),
            0
        );
    } else {
        // Default to midnight if no time is specified, though this might indicate a data issue.
        rideDateTime.setHours(0, 0, 0, 0);
        logger.warn(
            `RideModel ID ${rideModel.id} has no departure time specified. Defaulting to midnight for instance generation on ${date.toISOString().split("T")[0]}.`
        );
    }
    return rideDateTime;
}

/**
 * Creates a RideInstance record in the database if one does not already exist
 * for the given ride model and departure date/time.
 * @async
 * @param {RideModelAttributes} rideModel - The parent ride model.
 * @param {Date} instanceDepartureDateTime - The specific departure date and time for the new instance.
 * @returns {Promise<void>}
 */
async function createRideInstanceIfNotExists(
    rideModel,
    instanceDepartureDateTime
) {
    // Check if an instance already exists (and is not soft-deleted, if applicable)
    const existingInstance = await RideInstance.findOne({
        where: {
            rideId: rideModel.id,
            rideDate: instanceDepartureDateTime,
            // status: { [Op.ne]: 'cancelled_by_system' } // Optional: prevent re-creation if previously cancelled by system
        },
        // paranoid: false, // If you want to include soft-deleted ones in the check to prevent re-creation
    });

    if (!existingInstance) {
        logger.info(
            `Creating RideInstance for RideModel ID ${rideModel.id} on ${instanceDepartureDateTime.toISOString()}`
        );
        try {
            await RideInstance.create({
                rideId: rideModel.id,
                rideDate: instanceDepartureDateTime,
                seatsAvailable: rideModel.seatsAvailable, // Copy from template
                seatsBooked: 0, // New instance starts with 0 booked seats
                status: "scheduled", // Default status for new instances
            });
            logger.info(
                `Successfully created RideInstance for RideModel ID ${rideModel.id} on ${instanceDepartureDateTime.toISOString()}`
            );
        } catch (creationError) {
            logger.error(
                `Failed to create RideInstance for RideModel ID ${rideModel.id} on ${instanceDepartureDateTime.toISOString()}:`,
                creationError
            );
            // Continue to next iteration, don't let one failure stop the whole cron job.
        }
    } else {
        logger.debug(
            `RideInstance already exists for RideModel ID ${rideModel.id} on ${instanceDepartureDateTime.toISOString()}. Skipping creation.`
        );
    }
}

/**
 * Main function for the cron job. It fetches recurring ride models and generates
 * upcoming ride instances based on their recurrence rules and lookahead period.
 * @async
 * @throws {Error} If a critical error occurs during the process that prevents continuation.
 */
async function generateRecurringRideInstances() {
    logger.info("Starting recurring ride instance generation job...");
    try {
        const recurringRideModels = await getActiveRecurringRideModels();
        const upcomingDates = getUpcomingDatesForInstanceGeneration();

        if (recurringRideModels.length === 0) {
            logger.info("No active recurring ride models found. Exiting job.");
            return;
        }
        logger.info(
            `Found ${recurringRideModels.length} active recurring ride model(s) to process.`
        );

        for (const rideModel of recurringRideModels) {
            logger.debug(
                `Processing RideModel ID ${rideModel.id} with recurrence: ${JSON.stringify(rideModel.recurrence)}`
            );

            if (
                !Array.isArray(rideModel.recurrence) ||
                rideModel.recurrence.length === 0
            ) {
                logger.warn(
                    `Skipping RideModel ID ${rideModel.id}: Invalid or empty recurrence array.`
                );
                continue;
            }

            for (const date of upcomingDates) {
                if (shouldGenerateInstanceForDate(rideModel, date)) {
                    const instanceDepartureDateTime =
                        buildInstanceDepartureDateTime(rideModel, date);
                    await createRideInstanceIfNotExists(
                        rideModel,
                        instanceDepartureDateTime
                    );
                }
            }
        }
        logger.info(
            "Recurring ride instance generation job finished successfully."
        );
    } catch (error) {
        logger.error(
            "Critical error during recurring ride instance generation job:",
            error
        );
        throw error;
    }
}

export default generateRecurringRideInstances;
