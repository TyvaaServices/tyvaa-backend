import {
    DriverApplication,
    DriverProfile,
    PassengerProfile,
    User,
} from "#config/index.js";
import RedisCache from "#utils/redisCache.js";
import fs from "fs";
import path, { dirname } from "path";
import pump from "pump";
import { promisify } from "util";
import createLogger from "#utils/logger.js";
import { randomInt } from "crypto";
import {
    AppError,
    AuthenticationError,
    ConflictError,
    NotFoundError,
} from "#utils/customErrors.js";
import { fileURLToPath } from "url";
import sanitize from "sanitize-filename";
import sequelize from "#config/db.js";
import Role from "./../models/role.js";
import broker from "#broker/broker.js";

const pumpAsync = promisify(pump);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger("user-service");

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_PREFIX_LOGIN = "otp:login:";
const OTP_PREFIX_REGISTER = "otp:registration:";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "..", "uploads"); // Adjust path to be project root /uploads
fs.mkdirSync(UPLOADS_DIR, { recursive: true }); // Ensure upload directory exists

/**
 * Generates a secure random OTP.
 * @returns {string} The generated OTP.
 */
function generateOtp() {
    const min = Math.pow(10, OTP_LENGTH - 1);
    const max = Math.pow(10, OTP_LENGTH) - 1;
    return randomInt(min, max).toString();
}

/**
 * Normalize a phone number to always include country code (e.g., +221781706184)
 * If already starts with '+', return as is. Otherwise, prepend '+221'.
 */
function normalizePhoneNumber(phone) {
    if (!phone) return phone;
    return phone.startsWith("+") ? phone : `+221${phone}`;
}

/**
 * @typedef {Object} UserInstance
 * @property {number} id - The unique identifier for the user.
 * @property {string} phoneNumber - The user's phone number (unique).
 * @property {string} [fullName] - The user's full name.
 * @property {string} [fcmToken] - Firebase Cloud Messaging token for push notifications.
 * @property {string} [profileImage] - URL or path to the user's profile image.
 * @property {("male"|"female"|"other"|"prefer_not_to_say")} sexe - The user's gender.
 * @property {Date} [dateOfBirth] - The user's date of birth.
 * @property {string} [email] - The user's email address (optional, could be unique if primary identifier).
 * @property {boolean} isActive - Flag indicating if the user's account is active.
 * @property {boolean} isBlocked - Flag indicating if the user's account is blocked by an admin.
 * @property {number} [latitude] - Last known latitude of the user.
 * @property {number} [longitude] - Last known longitude of the user.
 * @property {Date} [lastLogin] - Timestamp of the user's last login.
 * @property {string} appLanguage - User's preferred app language (e.g., 'fr', 'en').
 */

/**
 * @file User Service: Handles business logic related to users, profiles, OTP, and file uploads.
 */

/**
 * @namespace userService
 * @description A service object that encapsulates all business logic related to user management,
 * authentication, profile updates, driver applications, and OTP handling.
 */
export const userService = {
    /**
     * Finds a user by their phone number or email, including their roles and profiles.
     * @async
     * @param {object} contactDetails - The contact details to search by.
     * @param {string} [contactDetails.phoneNumber] - The user's phone number.
     * @param {string} [contactDetails.email] - The user's email address.
     * @returns {Promise<UserInstance|null>} The Sequelize User instance with roles and profiles, or null if not found.
     * @memberof userService
     */
    findUserByPhoneOrEmail: async ({ phoneNumber, email }) => {
        logger.debug("Service: Finding user by phone or email", {
            phoneNumber,
            email,
        });
        const whereClause = email ? { email } : { phoneNumber };
        const user = await User.findOne({
            where: whereClause,
            include: [
                {
                    model: Role,
                    as: "roles",
                },
                {
                    model: PassengerProfile,
                    as: "passengerProfile",
                },
                { model: DriverProfile, as: "driverProfile" },
            ],
        });
        const roles = await user.getRoles();
        if (roles.length > 0) {
            user.roles = roles.map((role) => role.name);
        } else {
            user.roles = [];
        }
        logger.debug("Service: User found", {
            userId: user?.id,
            roles: user?.roles,
        });
        return user;
    },

    /**
     * Generates an OTP, stores it in Redis, and (conceptually) sends it.
     * In a real app, this would integrate with an SMS/Email service.
     * @async
     * @param {string} identifier - Phone number or email address of the user.
     * @param {"login"|"registration"} context - The context for which the OTP is generated (e.g., 'login', 'registration').
     * @returns {Promise<string>} The generated OTP. Note: In production, this OTP would be sent via SMS/email, not returned.
     * @throws {AppError} If there's an issue generating or storing the OTP in Redis.
     * @memberof userService
     */
    generateAndSendOtp: async (identifier, context) => {
        let normalizedIdentifier = identifier;
        // Normalize phone number only if it looks like a phone number and not an email
        if (!identifier.includes('@') && /^\d+$/.test(identifier.replace('+', ''))) {
            normalizedIdentifier = normalizePhoneNumber(identifier);
        }
        const otp = generateOtp();
        const redisKey =
            (context === "login" ? OTP_PREFIX_LOGIN : OTP_PREFIX_REGISTER) +
            normalizedIdentifier;
        try {
            await RedisCache.set(redisKey, otp, OTP_TTL_SECONDS);
            logger.info(
                `Generated and stored OTP for ${normalizedIdentifier} (context: ${context}). OTP: ${otp}`
            );
            // Log to console for debugging
            console.log(
                `OTP for ${normalizedIdentifier} (${context}): ${otp} saved to Redis with key: ${redisKey}`
            );
            // TODO: Implement actual sending of OTP via SMS/Email service here.
            return otp;
        } catch (error) {
            logger.error(
                { error, identifier: normalizedIdentifier, context },
                "Failed to generate or store OTP."
            );
            throw new AppError("Failed to process OTP request.", 500, error);
        }
    },

    /**
     * Verifies an OTP against the stored value in Redis.
     * @async
     * @param {string} identifier - Phone number or email address of the user.
     * @param {string} otp - The OTP submitted by the user for verification.
     * @param {"login"|"registration"} context - The context for which the OTP was generated.
     * @returns {Promise<void>} Resolves if OTP is valid.
     * @throws {AuthenticationError} If the OTP is invalid, expired, or not found.
     * @memberof userService
     */
    verifyOtp: async (identifier, otp, context) => {
        let normalizedIdentifier = identifier;
        if (!identifier.includes('@') && /^\d+$/.test(identifier.replace('+', ''))) {
            normalizedIdentifier = normalizePhoneNumber(identifier);
        }
        const redisKey =
            (context === "login" ? OTP_PREFIX_LOGIN : OTP_PREFIX_REGISTER) +
            normalizedIdentifier;
        logger.info(
            `[OTP VERIFY] identifier: '${identifier}', normalized: '${normalizedIdentifier}', context: '${context}', redisKey: '${redisKey}', provided OTP: '${otp}'`
        );
        const storedOtp = await RedisCache.get(redisKey);
        logger.info(
            `[OTP VERIFY] Redis GET for key '${redisKey}' returned:`,
            storedOtp
        );
        if (!storedOtp) {
            logger.warn(
                `OTP verification failed: No OTP found for ${normalizedIdentifier} (context: ${context}).`
            );
            throw new AuthenticationError(
                "OTP expired or not found. Please request a new one."
            );
        }
        logger.debug(
            `Verifying OTP for ${normalizedIdentifier} (context: ${context}). Stored OTP: ${storedOtp}, Provided OTP: ${otp}`
        );
        if (String(storedOtp) !== String(otp)) {
            logger.warn(
                `OTP verification failed: Invalid OTP for ${normalizedIdentifier} (context: ${context}).`
            );
            // TODO: Implement attempt limiting / account lockout for multiple failed OTPs.
            throw new AuthenticationError("Invalid OTP provided.");
        }
        await RedisCache.del(redisKey);
        logger.info(
            `OTP verified and deleted for ${normalizedIdentifier} (context: ${context}).`
        );
    },

    /**
     * Creates a new standard user (passenger or driver) with associated profiles and default roles.
     * Publishes a 'USER_WELCOME' notification event to the broker.
     * @async
     * @param {object} userData - Data for the new user.
     * @param {string} [userData.profileType="passenger"] - Type of profile to create ('passenger' or 'driver').
     * @param {string} userData.phoneNumber - User's phone number.
     * @param {string} [userData.email] - User's email.
     * @param {string} [userData.fullName] - User's full name.
     * @param {string} [userData.fcmToken] - User's Firebase Cloud Messaging token.
     * @param {string} [userData.appLanguage="fr"] - User's preferred application language.
     * @param {boolean} [userInfo.isBlocked=false] - User's blocked status.
     * @returns {Promise<UserInstance>} The created Sequelize User instance with profile information.
     * @throws {ConflictError} If a user with the given phone number or email already exists.
     * @throws {AppError} If user creation fails for other reasons.
     * @memberof userService
     */
    createUserWithProfile: async (userData) => {
        const { profileType = "passenger", ...userInfo } = userData;
        if (userInfo.phoneNumber) {
            userInfo.phoneNumber = normalizePhoneNumber(userInfo.phoneNumber);
        }
        logger.info("Service: Creating user with profile", {
            phoneNumber: userInfo.phoneNumber,
            profileType,
        });

        if (
            await User.findOne({ where: { phoneNumber: userInfo.phoneNumber } })
        ) {
            throw new ConflictError(
                "User with this phone number already exists."
            );
        }
        if (
            userInfo.email &&
            (await User.findOne({ where: { email: userInfo.email } }))
        ) {
            throw new ConflictError("User with this email already exists.");
        }

        // Ensure isBlocked is set to false by default
        if (userInfo.isBlocked === undefined || userInfo.isBlocked === null) {
            userInfo.isBlocked = false;
        }
        if (userInfo.email === "") {
            userInfo.email = null;
        }

        const transaction = await sequelize.transaction();
        try {
            const user = await User.create(
                { ...userInfo, isActive: true },
                { transaction }
            );
            await PassengerProfile.create({ userId: user.id }, { transaction });
            logger.info(`Created PassengerProfile for User ID: ${user.id}`);

            const roles = ["PASSENGER"];
            if (profileType === "driver") roles.push("CHAUFFEUR");
            await userService.assignBaseAndExtraRoles(user, roles, transaction);
            await transaction.commit();
            logger.info(
                `User and profile(s) created successfully for User ID: ${user.id}`
            );

            if (profileType === "passenger" || profileType === "driver") {
                // Using sendToQueue for direct message to the notification_created queue
                // Corrected eventType to USER_WELCOME
                // Standard message options; removed delay and maxRetries as they are not standard AMQP props here
                broker.sendToQueue(
                    "notification_created", // Queue name
                    { // Message payload
                        token: user.fcmToken || userInfo.fcmToken || "",
                        eventType: "USER_WELCOME",
                        data: {
                            userName: user.fullName,
                            profileType,
                            userId: user.id,
                            language: user.appLanguage || "fr",
                        },
                    },
                    { persistent: true, priority: 5 } // Message options
                ).catch(err => {
                    logger.error({ error: err, userId: user.id }, "Failed to send welcome notification to broker");
                    // Decide if this failure should affect user creation outcome - currently it does not.
                });
            }
            return user;
        } catch (error) {
            await transaction.rollback();
            console.log(
                {
                    errorMessage: error.message,
                    errorStack: error.stack,
                    userInfo,
                    profileType,
                },
                "Failed to create user with profile."
            );
            if (error instanceof ConflictError) throw error;
            throw new AppError("User creation failed.", 500, error);
        }
    },

    /**
     * Creates a "special" user (e.g., Admin, Supervisor) identified primarily by email.
     * Assigns `UTILISATEUR_BASE` and exactly one specified special role (e.g., `ADMINISTRATEUR`, `SUPERVISEUR`).
     * Does not create any `PassengerProfile` or `DriverProfile` for these users.
     * Email must end with `@tyvaa.live`.
     *
     * @async
     * @param {object} userData - User data. Must include `email`. May include `phoneNumber`, `sexe`, `fullName`, etc.
     * @param {string} userData.email - The user's email address (primary identifier, must end with `@tyvaa.live`).
     * @param {string} [userData.phoneNumber] - The user's phone number (optional).
     * @param {string[]} specialRoleInput - An array containing exactly one valid special role name.
     *                                      Valid special roles include `ADMINISTRATEUR`, `SUPERVISEUR`.
     * @returns {Promise<User>} The created Sequelize User instance.
     * @throws {ConflictError} If a user already exists with the provided email or phone number (if provided and unique).
     * @throws {AppError} If email is invalid (domain, missing), role input is invalid (count, disallowed role),
     *                    or for other creation errors.
     */
    createUserWithRoles: async (userData, specialRoleInput = []) => {
        logger.info(
            "Service: Creating special user (via email) with specific role",
            {
                email: userData.email,
                attemptedRole: specialRoleInput,
            }
        );

        if (!userData.email || !userData.email.endsWith("@tyvaa.live")) {
            throw new AppError(
                "Invalid or missing email for special user creation. Email must end with @tyvaa.live.",
                400
            );
        }

        const ALLOWED_SPECIAL_ROLES = [
            "ADMINISTRATEUR",
            "SUPERVISEUR",
            // Add other future special roles here, e.g., "EDITOR", "MODERATOR"
        ];
        const DISALLOWED_ROLES_FOR_SPECIAL_USER = ["PASSAGER", "CHAUFFEUR"];

        if (specialRoleInput.length !== 1) {
            throw new AppError(
                `Special users must be assigned exactly one primary role from the allowed list. Received: ${specialRoleInput.length} roles.`,
                400
            );
        }
        const roleToAssign = specialRoleInput[0];
        if (!ALLOWED_SPECIAL_ROLES.includes(roleToAssign)) {
            throw new AppError(
                `Invalid special role: ${roleToAssign}. Must be one of [${ALLOWED_SPECIAL_ROLES.join(", ")}].`,
                400
            );
        }
        if (DISALLOWED_ROLES_FOR_SPECIAL_USER.includes(roleToAssign)) {
            throw new AppError(
                `Role ${roleToAssign} cannot be assigned directly during special user creation.`,
                400
            );
        }

        if (await User.findOne({ where: { email: userData.email } })) {
            throw new ConflictError(
                `User with email ${userData.email} already exists.`
            );
        }
        // Optional: Check for phone number conflict if provided and needs to be unique across all users
        if (
            userData.phoneNumber &&
            (await User.findOne({
                where: { phoneNumber: userData.phoneNumber },
            }))
        ) {
            throw new ConflictError(
                `User with phone number ${userData.phoneNumber} already exists.`
            );
        }

        const transaction = await sequelize.transaction();
        try {
            // Ensure no profiles are created for these users
            const { ...restUserData } = userData; // Explicitly remove profileType if ever passed

            const user = await User.create(
                { ...restUserData, isActive: true }, // isActive true by default for special users, or adjust as needed
                { transaction }
            );

            // Assign UTILISATEUR_BASE and the validated single special role
            await userService.assignBaseAndExtraRoles(
                user,
                [roleToAssign], // Pass as an array
                transaction
            );

            await transaction.commit();
            logger.info(
                `Special user ${userData.email} created successfully with roles: [UTILISATEUR_BASE, ${roleToAssign}]`
            );
            return user;
        } catch (error) {
            await transaction.rollback();
            logger.error(
                { error, userData, roleToAssign },
                "Failed to create special user with roles."
            );
            if (error instanceof ConflictError || error instanceof AppError)
                throw error;
            throw new AppError(
                "Special user creation with roles failed.",
                500,
                error
            );
        }
    },

    /**
     * Updates a user's profile information, including optional profile image upload.
     * @async
     * @param {number|string} userId - The ID of the user to update.
     * @param {object} fieldsToUpdate - An object containing fields to update (e.g., fullName, email, sexe, dateOfBirth).
     * @param {object} [fileData] - Optional file data for profile image.
     * @param {Buffer} [fileData.buffer] - Buffer containing the image data.
     * @param {string} [fileData.filename] - Original filename of the image.
     * @param {string} [fileData.mimetype] - Mimetype of the image.
     * @returns {Promise<UserInstance>} The updated Sequelize User instance.
     * @throws {NotFoundError} If the user with the given ID is not found.
     * @throws {AppError} If image upload fails, validation fails, or for other update errors.
     * @memberof userService
     */
    updateUserProfile: async (userId, fieldsToUpdate, fileData) => {
        logger.info(`Service: Updating profile for User ID: ${userId}`);
        const userInstance = await User.findByPk(userId);
        if (!userInstance) {
            throw new NotFoundError(
                `User with ID ${userId} not found for update in service.`
            );
        }

        const allowedFields = ["fullName", "email", "sexe", "dateOfBirth"]; // Add other fields as necessary
        for (const key in fieldsToUpdate) {
            if (
                allowedFields.includes(key) &&
                userInstance[key] !== undefined
            ) {
                userInstance[key] = fieldsToUpdate[key];
            }
        }

        if (fileData?.buffer && fileData.filename) {
            if (
                !["image/jpeg", "image/png", "image/gif"].includes(
                    fileData.mimetype
                )
            ) {
                throw new AppError(
                    "Invalid profile image file type. Only JPEG, PNG, GIF allowed.",
                    400
                );
            }
            const sanitizedFilename = sanitize(fileData.filename);
            const uniqueFilename = `profile_${userInstance.id}_${Date.now()}${path.extname(sanitizedFilename)}`;
            const filePath = path.join(UPLOADS_DIR, uniqueFilename);

            try {
                fs.writeFileSync(filePath, fileData.buffer);
                userInstance.profileImage = `/uploads/${uniqueFilename}`;
                logger.info(
                    `Saved new profile image for User ID: ${userInstance.id} at ${filePath}`
                );
                // TODO: Delete old profile image if one exists and is different
            } catch (error) {
                logger.error(
                    { error, userId: userInstance.id },
                    "Failed to save profile image."
                );
                throw new AppError("Could not save profile image.", 500, error);
            }
        }

        try {
            await userInstance.save();
            logger.info(
                `User profile updated successfully for User ID: ${userInstance.id}`
            );
            return userInstance;
        } catch (error) {
            logger.error(
                { error, userId: userInstance.id },
                "Database error updating user profile."
            );
            if (error.name === "SequelizeValidationError") {
                throw new AppError(
                    `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
                    400,
                    error
                );
            }
            throw new AppError("Could not update user profile.", 500, error);
        }
    },

    /**
     * Processes a driver application submission, saving uploaded documents (PDF).
     * Creates a new DriverApplication record.
     * @async
     * @param {number|string} userId - The ID of the user submitting the application.
     * @param {AsyncIterable<import('@fastify/multipart').MultipartPart>} partsStream - The multipart stream from Fastify containing form data and files.
     * @returns {Promise<DriverApplication>} The created DriverApplication instance.
     * @throws {NotFoundError} If the user's passenger profile is not found.
     * @throws {ConflictError} If the user already has a pending application.
     * @throws {AppError} If no PDF document is provided or if there's an error processing the upload/saving the application.
     * @memberof userService
     */
    processDriverApplicationSubmission: async (userId, partsStream) => {
        logger.info(
            `Service: Processing driver application for User ID: ${userId}`
        );

        const passengerProfile = await PassengerProfile.findOne({
            where: { userId },
        });
        if (!passengerProfile) {
            throw new NotFoundError(
                "Passenger profile not found for this user. Cannot submit driver application."
            );
        }

        const existingApplication = await DriverApplication.findOne({
            where: {
                passengerProfileId: passengerProfile.id,
                status: "pending",
            },
        });
        if (existingApplication) {
            throw new ConflictError(
                "You already have a pending driver application."
            );
        }

        let pdfPath = null;
        for await (const part of partsStream) {
            if (
                part.file &&
                (part.fieldname === "documents" || part.fieldname === "pdf") &&
                part.mimetype === "application/pdf"
            ) {
                const sanitizedFilename = sanitize(part.filename);
                const uniqueFilename = `driver_application_${passengerProfile.id}_${Date.now()}_${sanitizedFilename}`;
                const filePath = path.join(UPLOADS_DIR, uniqueFilename);

                logger.debug(
                    `Attempting to save driver application PDF to: ${filePath}`
                );
                const writeStream = fs.createWriteStream(filePath);
                try {
                    await pumpAsync(part.file, writeStream);
                    pdfPath = `/uploads/${uniqueFilename}`;
                    logger.info(
                        `Saved driver application PDF for PassengerProfile ID: ${passengerProfile.id} at ${filePath}`
                    );
                    break;
                } catch (error) {
                    logger.error(
                        { error, passengerProfileId: passengerProfile.id },
                        "Failed to save driver application PDF stream."
                    );
                    throw new AppError(
                        "Error processing document upload.",
                        500,
                        error
                    );
                }
            } else if (part.file) {
                logger.warn(
                    `Received unexpected file part: ${part.fieldname}, mimetype: ${part.mimetype}. Draining stream.`
                );
                await part.file.resume();
            }
        }

        if (!pdfPath) {
            logger.warn(
                `No PDF document found in submission for PassengerProfile ID: ${passengerProfile.id}`
            );
            throw new AppError(
                "A PDF document is required for driver application.",
                400
            );
        }

        const application = await DriverApplication.create({
            passengerProfileId: passengerProfile.id, // Use the found passengerProfile.id
            documents: pdfPath,
            status: "pending",
        });
        logger.info(
            `DriverApplication record created with ID: ${application.id} for User ID: ${userId}`
        );
        return application;
    },

    /**
     * Retrieves the status of a user's most recent driver application.
     * @async
     * @param {number|string} userId - The ID of the user.
     * @returns {Promise<{status: string, comments: string|null}>} An object with the application status and comments.
     *          Status can be 'not_applied' if no application is found.
     * @throws {NotFoundError} If the user's passenger profile is not found.
     * @memberof userService
     */
    getDriverApplicationStatus: async (userId) => {
        logger.debug(
            `Service: Getting driver application status for User ID: ${userId}.`
        );
        const passengerProfile = await PassengerProfile.findOne({
            where: { userId },
        });
        if (!passengerProfile) {
            throw new NotFoundError( // This error might be misleading if the goal is just to say "no application"
                "Passenger profile not found for this user. Cannot determine driver application status."
            );
        }
        const application = await DriverApplication.findOne({
            where: { passengerProfileId: passengerProfile.id },
            order: [["createdAt", "DESC"]],
        });
        if (!application) {
            return { status: "not_applied", comments: null };
        }
        logger.info(
            `Service: Fetched driver application status for User ID: ${userId}, Status: ${application.status}`
        );
        return {
            status: application.status,
            comments: application.comments || null,
        };
    },

    /**
     * Finds a passenger profile by user ID.
     * @async
     * @param {number|string} userId - The ID of the user.
     * @returns {Promise<PassengerProfile|null>} The Sequelize PassengerProfile instance or null if not found.
     * @memberof userService
     */
    findPassengerProfileByUserId: async (userId) => {
        logger.debug(
            `Service: Finding passenger profile for User ID: ${userId}`
        );
        return PassengerProfile.findOne({ where: { userId } });
    },

    /**
     * Blocks a user by setting their `isBlocked` flag to true and `isActive` to false.
     * @async
     * @param {number|string} userIdToBlock - The ID of the user to block.
     * @returns {Promise<UserInstance>} The updated Sequelize User instance.
     * @throws {NotFoundError} If the user with the given ID is not found.
     * @memberof userService
     */
    blockUser: async (userIdToBlock) => {
        logger.debug(`Service: Blocking user ID: ${userIdToBlock}.`);
        const user = await User.findByPk(userIdToBlock);
        if (!user) {
            throw new NotFoundError(
                `User with ID ${userIdToBlock} not found for blocking in service.`
            );
        }
        user.isBlocked = true;
        user.isActive = false; // Also mark as inactive
        await user.save();
        logger.info(`Service: User ID ${userIdToBlock} has been blocked.`);
        return user;
    },

    /**
     * Retrieves all driver applications, including applicant's user details.
     * @async
     * @returns {Promise<DriverApplication[]>} An array of DriverApplication instances.
     * @throws {AppError} If there's an error querying the database.
     * @memberof userService
     */
    getAllDriverApplications: async () => {
        logger.debug("Service: Fetching all driver applications.");
        try {
            return DriverApplication.findAll({
                include: [
                    {
                        model: PassengerProfile,
                        as: "applicantProfile",
                        include: [
                            {
                                model: User,
                                as: "user",
                                attributes: {
                                    exclude: [
                                        "fcmToken",
                                        "passwordHash",
                                        "otpSecret",
                                    ],
                                },
                            },
                        ],
                    },
                ],
                order: [["createdAt", "DESC"]],
            });
        } catch (error) {
            logger.error(
                { error },
                "Service error: Failed to fetch driver applications."
            );
            throw new AppError(
                "Could not retrieve driver applications from service.",
                500,
                error
            );
        }
    },

    /**
     * Reviews a driver application, updating its status and comments.
     * If approved, creates/activates a driver profile and assigns the 'CHAUFFEUR' role.
     * @async
     * @param {number|string} applicationId - The ID of the driver application to review.
     * @param {"approved"|"rejected"|"pending"} status - The new status for the application.
     * @param {string} [comments] - Optional comments regarding the review.
     * @returns {Promise<DriverApplication>} The updated DriverApplication instance.
     * @throws {NotFoundError} If the application is not found.
     * @throws {AppError} If applicant profile information is missing, user for role assignment is not found, or for other processing errors.
     * @memberof userService
     */
    reviewDriverApplication: async (applicationId, status, comments) => {
        logger.debug(
            `Service: Reviewing driver application ID: ${applicationId} with status: ${status}`
        );
        const transaction = await sequelize.transaction();
        try {
            const application = await DriverApplication.findByPk(
                applicationId,
                {
                    include: [
                        { model: PassengerProfile, as: "applicantProfile" },
                    ],
                    transaction,
                }
            );

            if (!application) {
                throw new NotFoundError(
                    `Driver application with ID ${applicationId} not found.`
                );
            }
            if (
                !application.applicantProfile ||
                !application.applicantProfile.userId
            ) {
                throw new AppError(
                    "Application is missing valid applicant profile information.",
                    500
                );
            }

            application.status = status;
            application.comments = comments || null;
            await application.save({ transaction });

            if (status === "approved") {
                const userId = application.applicantProfile.userId;
                let driverProfile = await DriverProfile.findOne({
                    where: { userId },
                    transaction,
                });
                if (!driverProfile) {
                    driverProfile = await DriverProfile.create(
                        { userId, status: "active" },
                        { transaction }
                    );
                    logger.info(
                        `Service: Created new DriverProfile for User ID: ${userId}`
                    );
                } else {
                    driverProfile.status = "active";
                    await driverProfile.save({ transaction });
                    logger.info(
                        `Service: Updated existing DriverProfile to active for User ID: ${userId}`
                    );
                }
                const user = await User.findByPk(userId, { transaction });
                if (!user) {
                    throw new AppError(
                        `User not found for role assignment during driver approval. User ID: ${userId}`,
                        500
                    );
                }
                await userService.assignBaseAndExtraRoles(
                    user,
                    ["CHAUFFEUR"],
                    transaction
                );
                logger.info(
                    `Service: Assigned CHAUFFEUR role to User ID: ${userId}`
                );
            }
            await transaction.commit();
            logger.info(
                `Service: Driver application ID ${applicationId} reviewed. Status: ${status}.`
            );
            return application;
        } catch (error) {
            await transaction.rollback();
            logger.error(
                { error, applicationId },
                "Service error: Failed to review driver application."
            );
            if (error instanceof NotFoundError || error instanceof AppError)
                throw error;
            throw new AppError(
                "Could not review driver application from service.",
                500,
                error
            );
        }
    },

    /**
     * Retrieves all users, excluding sensitive fields.
     * @async
     * @returns {Promise<UserInstance[]>} An array of Sequelize User instances.
     * @throws {AppError} If there's an error querying the database.
     * @memberof userService
     */
    getAllUsers: async () => {
        logger.debug("Service: Fetching all users.");
        try {
            return User.findAll({
                attributes: {
                    exclude: ["passwordHash", "otpSecret", "fcmToken"], // fcmToken also sensitive
                },
            });
        } catch (error) {
            logger.error(
                { error },
                "Service error: Failed to fetch all users."
            );
            throw new AppError(
                "Could not retrieve users from service.",
                500,
                error
            );
        }
    },

    /**
     * Retrieves a single user by their ID, excluding sensitive fields.
     * @async
     * @param {number|string} id - The ID of the user to retrieve.
     * @returns {Promise<UserInstance>} The Sequelize User instance.
     * @throws {NotFoundError} If the user with the given ID is not found.
     * @throws {AppError} If there's an error querying the database.
     * @memberof userService
     */
    getUserById: async (id) => {
        logger.debug(`Service: Fetching user by ID: ${id}.`);
        try {
            const user = await User.findByPk(id, {
                attributes: { exclude: ["passwordHash", "otpSecret"] }, // fcmToken might be okay here if user is requesting own data
            });
            if (!user) {
                throw new NotFoundError(
                    `User with ID ${id} not found in service.`
                );
            }
            return user;
        } catch (error) {
            logger.error(
                { error, userId: id },
                "Service error: Failed to fetch user by ID."
            );
            if (error instanceof NotFoundError) throw error;
            throw new AppError(
                `Could not retrieve user with ID ${id} from service.`,
                500,
                error
            );
        }
    },

    /**
     * Logs in a user after verifying their identifier (phone/email) and OTP.
     * Updates the user's last login timestamp.
     * @async
     * @param {string} identifier - The user's phone number or email.
     * @param {string} otp - The One-Time Password submitted by the user.
     * @returns {Promise<UserInstance>} The logged-in Sequelize User instance.
     * @throws {NotFoundError} If the user is not found.
     * @throws {AuthenticationError} If the account is inactive/blocked or OTP is invalid.
     * @memberof userService
     */
    loginUser: async function (identifier, otp) { // Retained `function` for `this` context if it was intentional, though not used here.
        logger.debug(`Service: Processing login for identifier: ${identifier}`);
        const contactDetails = identifier.includes("@")
            ? { email: identifier }
            : { phoneNumber: normalizePhoneNumber(identifier) }; // Normalize phone for lookup
        const user = await this.findUserByPhoneOrEmail(contactDetails);

        if (!user) {
            throw new NotFoundError("User not found with these credentials.");
        }
        if (!user.isActive || user.isBlocked) {
            throw new AuthenticationError("Account is inactive or blocked.");
        }
        await this.verifyOtp(identifier, otp, "login"); // identifier for verifyOtp should match what was used for generateAndSendOtp
        user.lastLogin = new Date();
        await user.save();
        logger.info(
            `Service: User ID ${user.id} logged in successfully, lastLogin updated.`
        );
        return user;
    },

    /**
     * Requests an OTP for user registration. Ensures the phone number is not already in use.
     * @async
     * @param {string} phoneNumber - The phone number for which to request a registration OTP.
     * @returns {Promise<string>} The generated OTP.
     * @throws {ConflictError} If a user with the given phone number already exists.
     * @memberof userService
     */
    requestRegisterOtp: async function (phoneNumber) { // Retained `function`
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        logger.debug(
            `Service: Requesting registration OTP for phone: ${normalizedPhone}.`
        );
        const existingUser = await User.findOne({ where: { phoneNumber: normalizedPhone } });
        if (existingUser) {
            throw new ConflictError(
                "A user with this phone number already exists."
            );
        }
        return this.generateAndSendOtp(normalizedPhone, "registration");
    },

    /**
     * Deletes a user by their ID (soft delete if paranoid, hard delete if not).
     * Currently performs a hard delete via `user.destroy()`.
     * @async
     * @param {number|string} userId - The ID of the user to delete.
     * @returns {Promise<boolean>} True if deletion was successful.
     * @throws {NotFoundError} If the user with the given ID is not found.
     * @memberof userService
     */
    deleteUser: async (userId) => {
        logger.debug(`Service: Deleting user ID: ${userId}.`);
        const user = await User.findByPk(userId);
        if (!user) {
            throw new NotFoundError(
                `User with ID ${userId} not found for deletion in service.`
            );
        }
        await user.destroy(); // This is a hard delete.
        logger.info(`Service: User ID ${userId} marked as deleted.`);
        return true;
    },

    /**
     * Updates the Firebase Cloud Messaging (FCM) token for a user.
     * @async
     * @param {number|string} userId - The ID of the user.
     * @param {string} fcmToken - The new FCM token.
     * @returns {Promise<UserInstance>} The updated Sequelize User instance.
     * @throws {NotFoundError} If the user with the given ID is not found.
     * @memberof userService
     */
    updateFcmToken: async (userId, fcmToken) => {
        logger.debug(`Service: Updating FCM token for user ID: ${userId}.`);
        const user = await User.findByPk(userId);
        if (!user) {
            throw new NotFoundError(
                `User with ID ${userId} not found for FCM token update in service.`
            );
        }
        user.fcmToken = fcmToken;
        await user.save();
        logger.info(`Service: FCM token updated for user ID: ${userId}`);
        return user;
    },

    /**
     * Updates the last known location (latitude and longitude) for a user.
     * @async
     * @param {number|string} userId - The ID of the user.
     * @param {{latitude: number, longitude: number}} location - An object with latitude and longitude.
     * @returns {Promise<UserInstance>} The updated Sequelize User instance.
     * @throws {NotFoundError} If the user with the given ID is not found.
     * @memberof userService
     */
    updateLocation: async (userId, location) => {
        logger.debug(`Service: Updating location for user ID: ${userId}.`);
        const user = await User.findByPk(userId);
        if (!user) {
            throw new NotFoundError(
                `User with ID ${userId} not found for location update in service.`
            );
        }
        user.latitude = location.latitude;
        user.longitude = location.longitude;
        await user.save();
        logger.info(`Service: Location updated for user ID: ${userId}`);
        return user;
    },

    /**
     * Assigns the base 'UTILISATEUR_BASE' role and any specified additional roles to a user.
     * This method ensures that 'UTILISATEUR_BASE' is always present and avoids duplicate role assignments.
     * It's designed to be used internally, often within a transaction.
     * @async
     * @param {UserInstance} user - The Sequelize User instance to assign roles to.
     * @param {string[]} [extraRoleNames=[]] - An array of additional role names (e.g., 'PASSENGER', 'CHAUFFEUR', 'ADMINISTRATEUR').
     * @param {import('sequelize').Transaction} transaction - The Sequelize transaction object.
     * @returns {Promise<void>}
     * @throws {AppError} If the essential 'UTILISATEUR_BASE' role is not found in the database.
     * @memberof userService
     */
    assignBaseAndExtraRoles: async (user, extraRoleNames = [], transaction) => {
        logger.debug(
            `Service: Assigning roles to User ID: ${user.id}. Base role + Extras: [${extraRoleNames.join(", ")}]`
        );

        // 1. Ensure UTILISATEUR_BASE role is assigned
        const baseRole = await Role.findOne({
            where: { name: "UTILISATEUR_BASE" },
            transaction,
        });
        if (!baseRole) {
            // This is a critical setup issue
            logger.error(
                "CRITICAL: UTILISATEUR_BASE role not found in database."
            );
            throw new AppError("Base user role configuration error.", 500);
        }
        await user.addRole(baseRole, { transaction });
        logger.debug(
            `Service: Assigned UTILISATEUR_BASE to User ID: ${user.id}`
        );

        // 2. Process and assign additional unique roles
        // Use a Set to ensure uniqueness among the provided extraRoleNames and exclude UTILISATEUR_BASE
        const uniqueExtraRoleNames = new Set(
            extraRoleNames.filter((roleName) => roleName !== "UTILISATEUR_BASE")
        );

        if (uniqueExtraRoleNames.size > 0) {
            const rolesToAssign = await Role.findAll({
                where: { name: Array.from(uniqueExtraRoleNames) },
                transaction,
            });

            if (rolesToAssign.length !== uniqueExtraRoleNames.size) {
                logger.warn(
                    `Service: Some requested roles not found. Requested: [${Array.from(uniqueExtraRoleNames).join(", ")}], Found: [${rolesToAssign.map((r) => r.name).join(", ")}]`
                );
                // Optionally, throw an error if any requested role is not found,
                // or proceed with assigning only the found ones.
                // For now, proceeding with found ones.
            }

            if (rolesToAssign.length > 0) {
                await user.addRoles(rolesToAssign, { transaction });
                logger.debug(
                    `Service: Assigned extra roles [${rolesToAssign.map((r) => r.name).join(", ")}] to User ID: ${user.id}`
                );
            }
        }
        // Sequelize's addRole/addRoles are generally idempotent (won't create duplicates in join table if records exist)
        // Refresh roles on the instance if needed by the caller, or re-fetch user.
    },
};
