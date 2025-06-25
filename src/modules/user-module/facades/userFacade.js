import { userService } from "./../services/userService.js";
import createLogger from "#utils/logger.js";
import { NotFoundError } from "#utils/customErrors.js";
const logger = createLogger("user-facade");

/**
 * @file User Facade: Provides a simplified interface to user-related services and operations.
 * Handles data fetching, aggregation, and error mapping for the controller layer.
 * @typedef {import('../models/user.js').UserAttributes} UserAttributes
 * @typedef {import('../models/driverApplication.js').DriverApplicationAttributes} DriverApplicationAttributes
 * @typedef {import('../models/passengerProfile.js').PassengerProfileAttributes} PassengerProfileAttributes
 * @typedef {import('../models/driverProfile.js').DriverProfileAttributes} DriverProfileAttributes
 */

export const userFacade = {
    /**
     * Retrieves all driver applications with associated user details.
     * @returns {Promise<DriverApplicationAttributes[]>}
     * @throws {AppError} If database query fails.
     */
    getAllDriverApplications: async () => {
        logger.debug(
            "Facade: Calling service to fetch all driver applications."
        );
        return userService.getAllDriverApplications();
    },

    /**
     * Reviews a driver application, updating its status and potentially creating/activating a driver profile.
     * @param {string|number} applicationId - The ID of the driver application.
     * @param {'approved'|'rejected'|'needs_more_info'} status - The new status for the application.
     * @param {string} [comments] - Optional comments from the reviewer.
     * @returns {Promise<DriverApplicationAttributes>} The updated driver application.
     * @throws {NotFoundError} If the application is not found.
     * @throws {AppError} For other processing errors.
     */
    reviewDriverApplication: async (applicationId, status, comments) => {
        logger.debug(
            `Facade: Calling service to review driver application ID: ${applicationId}`
        );
        return userService.reviewDriverApplication(
            applicationId,
            status,
            comments
        );
    },

    /**
     * Retrieves all users.
     * @returns {Promise<UserAttributes[]>}
     * @throws {AppError}
     */
    getAllUsers: async () => {
        logger.debug("Facade: Calling service to fetch all users.");
        return userService.getAllUsers();
    },

    /**
     * Retrieves a user by ID.
     * @param {string|number} id - User ID.
     * @returns {Promise<UserAttributes|null>} User or null if not found.
     * @throws {AppError}
     */
    getUserById: async (id) => {
        logger.debug(`Facade: Calling service to fetch user by ID: ${id}.`);
        return userService.getUserById(id);
    },

    /**
     * Requests an OTP for login.
     * @param {{phoneNumber?: string, email?: string}} contactDetails - Phone or email.
     * @returns {Promise<void>}
     * @throws {NotFoundError} If user not found.
     * @throws {AppError}
     */
    requestLoginOtp: async (contactDetails) => {
        logger.debug("Requesting login OTP from facade:", contactDetails);
        const user = await userService.findUserByPhoneOrEmail(contactDetails);
        if (!user) {
            throw new NotFoundError("User not registered with these details.");
        }
        const otp = await userService.generateAndSendOtp(
            contactDetails.phoneNumber || contactDetails.email,
            "login"
        );
        logger.info(`Login OTP ${otp} request processed for:`, contactDetails);
    },

    /**
     * Logs in a user.
     * @param {{phoneNumber?: string, email?: string, otp: string}} credentials
     * @returns {Promise<UserAttributes>} Logged-in user.
     * @throws {AuthenticationError} For invalid credentials or OTP.
     * @throws {NotFoundError} If user not found.
     */
    login: async ({ phoneNumber, email, otp }) => {
        const identifier = email || phoneNumber;
        logger.debug(`Facade: Calling service to login user: ${identifier}`);
        return userService.loginUser(identifier, otp);
    },

    /**
     * Requests an OTP for registration.
     * @param {string} phoneNumber
     * @returns {Promise<void>}
     * @throws {ConflictError} If user already exists.
     * @throws {AppError}
     */
    requestRegisterOtp: async (phoneNumber) => {
        logger.debug(
            `Facade: Calling service to request registration OTP for phone: ${phoneNumber}.`
        );
        // The service method will handle ConflictError or proceed to send OTP.
        return userService.requestRegisterOtp(phoneNumber);
    },

    /**
     * Creates a new user.
     * @param {object} userData - Includes OTP and other user details.
     * @returns {Promise<UserAttributes>} The created user.
     * @throws {AuthenticationError} If OTP is invalid.
     * @throws {ConflictError} If user already exists (double check).
     * @throws {AppError}
     */
    createUser: async (userData) => {
        logger.debug("Creating user from facade with data:", userData);
        await userService.verifyOtp(
            userData.phoneNumber,
            userData.otp,
            "registration"
        );
        const user = await userService.createUserWithProfile(userData);
        logger.info(`User created successfully with ID: ${user.id}`);
        return user;
    },

    /**
     * Updates a user's profile.
     * @param {string|number} userId
     * @param {object} fieldsToUpdate - Key-value pairs of fields to update.
     * @param {object} [fileData] - Optional file data for profile image.
     * @returns {Promise<UserAttributes>} Updated user.
     * @throws {NotFoundError}
     * @throws {AppError}
     */
    updateUser: async (userId, fieldsToUpdate, fileData) => {
        logger.debug(`Facade: Calling service to update user ID: ${userId}.`);
        return userService.updateUserProfile(userId, fieldsToUpdate, fileData);
    },

    /**
     * Deletes a user.
     * @param {string|number} userId
     * @returns {Promise<boolean>} True if deleted.
     * @throws {NotFoundError}
     * @throws {AppError}
     */
    deleteUser: async (userId) => {
        logger.debug(`Facade: Calling service to delete user ID: ${userId}.`);
        return userService.deleteUser(userId);
    },

    /**
     * Updates FCM token for a user.
     * @param {string|number} userId
     * @param {string} fcmToken
     * @returns {Promise<UserAttributes>} Updated user.
     * @throws {NotFoundError}
     */
    updateFcmToken: async (userId, fcmToken) => {
        logger.debug(
            `Facade: Calling service to update FCM token for user ID: ${userId}.`
        );
        return userService.updateFcmToken(userId, fcmToken);
    },

    /**
     * Updates user's location.
     * @param {string|number} userId
     * @param {{latitude: number, longitude: number}} location
     * @returns {Promise<UserAttributes>} Updated user.
     * @throws {NotFoundError}
     */
    updateLocation: async (userId, location) => {
        logger.debug(
            `Facade: Calling service to update location for user ID: ${userId}.`
        );
        return userService.updateLocation(userId, location);
    },

    /**
     * Submits a driver application.
     * @param {string|number} userId - ID of the user (who has a passenger profile).
     * @param {any} partsStream - Multipart stream from Fastify.
     * @returns {Promise<DriverApplicationAttributes>}
     * @throws {NotFoundError} If passenger profile not found.
     * @throws {ConflictError} If pending application exists.
     * @throws {AppError}
     */
    submitDriverApplication: async (userId, partsStream) => {
        logger.debug(
            `Facade: Calling service to submit driver application for user ID: ${userId}.`
        );
        return userService.processDriverApplicationSubmission(
            userId,
            partsStream
        );
    },

    /**
     * Gets driver application status for a user.
     * @param {string|number} userId
     * @returns {Promise<{status: string, comments: string|null}>}
     * @throws {NotFoundError} If passenger profile or application not found.
     */
    getDriverApplicationStatus: async (userId) => {
        logger.debug(
            `Facade: Calling service to get driver application status for user ID: ${userId}.`
        );
        return userService.getDriverApplicationStatus(userId);
    },

    /**
     * Blocks a user.
     * @param {string|number} userIdToBlock
     * @returns {Promise<UserAttributes>} Blocked user.
     * @throws {NotFoundError}
     */
    blockUser: async (userIdToBlock) => {
        logger.debug(
            `Facade: Calling service to block user ID: ${userIdToBlock}.`
        );
        return userService.blockUser(userIdToBlock);
    },
};
