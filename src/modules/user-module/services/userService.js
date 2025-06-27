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
 * @file User Service: Handles business logic related to users, profiles, OTP, and file uploads.
 */
export const userService = {
    /**
     * Finds a user by their phone number or email.
     * @param {{phoneNumber?: string, email?: string}} contactDetails
     * @returns {Promise<User|null>}
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
     * @param {string} identifier - Phone number or email.
     * @param {"login"|"registration"} context - Purpose of the OTP.
     * @returns {Promise<string>} The generated OTP (for testing/dev; not for prod response).
     * @throws {AppError} If OTP generation or storage fails.
     */
    generateAndSendOtp: async (identifier, context) => {
        const otp = generateOtp();
        const redisKey =
            (context === "login" ? OTP_PREFIX_LOGIN : OTP_PREFIX_REGISTER) +
            identifier;
        try {
            await RedisCache.set(redisKey, otp, OTP_TTL_SECONDS);
            logger.info(
                `Generated and stored OTP for ${identifier} (context: ${context}). OTP: ${otp}`
            );
            // TODO: Implement actual sending of OTP via SMS/Email service here.
            return otp;
        } catch (error) {
            logger.error(
                { error, identifier, context },
                "Failed to generate or store OTP."
            );
            throw new AppError("Failed to process OTP request.", 500, error);
        }
    },

    /**
     * Verifies an OTP against the stored value in Redis.
     * @param {string} identifier - Phone number or email.
     * @param {string} otp - The OTP submitted by the user.
     * @param {"login"|"registration"} context - Purpose of the OTP.
     * @returns {Promise<void>}
     * @throws {AuthenticationError} If OTP is invalid or expired.
     */
    verifyOtp: async (identifier, otp, context) => {
        const redisKey =
            (context === "login" ? OTP_PREFIX_LOGIN : OTP_PREFIX_REGISTER) +
            identifier;
        const storedOtp = await RedisCache.get(redisKey);

        if (!storedOtp) {
            logger.warn(
                `OTP verification failed: No OTP found for ${identifier} (context: ${context}).`
            );
            throw new AuthenticationError(
                "OTP expired or not found. Please request a new one."
            );
        }
        logger.debug(
            `Verifying OTP for ${identifier} (context: ${context}). Stored OTP: ${storedOtp}, Provided OTP: ${otp}`
        );
        if (String(storedOtp) !== String(otp)) {
            logger.warn(
                `OTP verification failed: Invalid OTP for ${identifier} (context: ${context}).`
            );
            // TODO: Implement attempt limiting / account lockout for multiple failed OTPs.
            throw new AuthenticationError("Invalid OTP provided.");
        }
        await RedisCache.del(redisKey);
        logger.info(
            `OTP verified and deleted for ${identifier} (context: ${context}).`
        );
    },

    /**
     * Creates a new user along with their default passenger profile.
     * Optionally creates a driver profile if specified.
     * Assigns default roles.
     * @param {object} userData - User data including profileType ('passenger' or 'driver').
     * @returns {Promise<User>} The created User instance with profiles.
     * @throws {ConflictError} If user already exists with phone/email.
     * @throws {AppError} For other creation errors.
     */
    createUserWithProfile: async (userData) => {
        const { profileType = "passenger", ...userInfo } = userData;
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

        const transaction = await sequelize.transaction();
        try {
            const user = await User.create(
                { ...userInfo, isActive: true },
                { transaction }
            );
            await PassengerProfile.create({ userId: user.id }, { transaction });
            logger.info(`Created PassengerProfile for User ID: ${user.id}`);
            // if (profileType === "driver") {
            //     await DriverProfile.create(
            //         { userId: user.id, status: "pending_approval" },
            //         { transaction }
            //     );
            //     logger.info(
            //         `Created DriverProfile (pending_approval) for User ID: ${user.id}`
            //     );
            // }
            // Assign base and extra roles (PASSENGER, DRIVER)
            const roles = ["PASSENGER"];
            if (profileType === "driver") roles.push("CHAUFFEUR");
            await userService.assignBaseAndExtraRoles(user, roles, transaction);
            await transaction.commit();
            logger.info(
                `User and profile(s) created successfully for User ID: ${user.id}`
            );
            return user;
        } catch (error) {
            await transaction.rollback();
            logger.error(
                { error, userData },
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
     * Updates a user's profile information, including potentially a profile image.
     * @param userId
     * @param {object} fieldsToUpdate - Key-value pairs of user model fields.
     * @param {object} [fileData] - Optional file data for the profile image.
     * @param {Buffer} [fileData.buffer]
     * @param {string} [fileData.filename]
     * @param {string} [fileData.mimetype]
     * @returns {Promise<User>} The updated User instance.
     * @throws {AppError} For update errors or invalid file type.
     */
    updateUserProfile: async (userId, fieldsToUpdate, fileData) => {
        logger.info(`Service: Updating profile for User ID: ${userId}`);
        const userInstance = await User.findByPk(userId); // Fetch user
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
     * Saves a PDF file from a multipart stream for a driver application.
     * @param userId
     * @param {any} partsStream - The multipart stream from Fastify.
     * @returns {Promise<string>} The relative path to the saved PDF file.
     * @throws {AppError} If no PDF file is found or saving fails.
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

    getDriverApplicationStatus: async (userId) => {
        logger.debug(
            `Service: Getting driver application status for User ID: ${userId}.`
        );
        const passengerProfile = await PassengerProfile.findOne({
            where: { userId },
        });
        if (!passengerProfile) {
            throw new NotFoundError(
                "No driver application found for this user (no passenger profile in service)."
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
     * @param {string|number} userId
     * @returns {Promise<PassengerProfile|null>}
     */
    findPassengerProfileByUserId: async (userId) => {
        logger.debug(
            `Service: Finding passenger profile for User ID: ${userId}`
        );
        return PassengerProfile.findOne({ where: { userId } });
    },

    blockUser: async (userIdToBlock) => {
        logger.debug(`Service: Blocking user ID: ${userIdToBlock}.`);
        const user = await User.findByPk(userIdToBlock);
        if (!user) {
            throw new NotFoundError(
                `User with ID ${userIdToBlock} not found for blocking in service.`
            );
        }
        user.isBlocked = true;
        user.isActive = false;
        await user.save();
        logger.info(`Service: User ID ${userIdToBlock} has been blocked.`);
        return user;
    },

    /**
     * Retrieves all driver applications with associated user details.
     * @returns {Promise<DriverApplicationAttributes[]>}
     * @throws {AppError} If database query fails.
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

    getAllUsers: async () => {
        logger.debug("Service: Fetching all users.");
        try {
            return User.findAll({
                attributes: {
                    exclude: ["passwordHash", "otpSecret", "fcmToken"],
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

    getUserById: async (id) => {
        logger.debug(`Service: Fetching user by ID: ${id}.`);
        try {
            const user = await User.findByPk(id, {
                attributes: { exclude: ["passwordHash", "otpSecret"] },
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

    loginUser: async function (identifier, otp) {
        logger.debug(`Service: Processing login for identifier: ${identifier}`);
        const contactDetails = identifier.includes("@")
            ? { email: identifier }
            : { phoneNumber: identifier };
        const user = await this.findUserByPhoneOrEmail(contactDetails);

        if (!user) {
            throw new NotFoundError("User not found with these credentials.");
        }
        if (!user.isActive || user.isBlocked) {
            throw new AuthenticationError("Account is inactive or blocked.");
        }
        await this.verifyOtp(identifier, otp, "login");
        user.lastLogin = new Date();
        await user.save();
        logger.info(
            `Service: User ID ${user.id} logged in successfully, lastLogin updated.`
        );
        return user;
    },

    requestRegisterOtp: async function (phoneNumber) {
        logger.debug(
            `Service: Requesting registration OTP for phone: ${phoneNumber}.`
        );
        const existingUser = await User.findOne({ where: { phoneNumber } });
        if (existingUser) {
            throw new ConflictError(
                "A user with this phone number already exists."
            );
        }
        return this.generateAndSendOtp(phoneNumber, "registration");
    },

    deleteUser: async (userId) => {
        logger.debug(`Service: Deleting user ID: ${userId}.`);
        const user = await User.findByPk(userId);
        if (!user) {
            throw new NotFoundError(
                `User with ID ${userId} not found for deletion in service.`
            );
        }
        await user.destroy();
        logger.info(`Service: User ID ${userId} marked as deleted.`);
        return true;
    },

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
     * Assigns the UTILISATEUR_BASE role and any additional roles to a user.
     * @param {User} user - The user instance.
     * @param {string[]} roles - Array of role names to assign (excluding duplicates).
     * @param {object} transaction - The sequelize transaction.
     */
    /**
     * Assigns the UTILISATEUR_BASE role and any additional unique roles to a user.
     * Ensures UTILISATEUR_BASE is always present and avoids duplicate role assignments.
     * @param {User} user - The Sequelize User instance.
     * @param {string[]} extraRoleNames - Array of additional role names to assign.
     * @param {object} transaction - The Sequelize transaction object.
     * @throws {AppError} If the UTILISATEUR_BASE role is not found in the database.
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
