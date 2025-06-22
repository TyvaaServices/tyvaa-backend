import createLogger from "#utils/logger.js";
import pump from "pump";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {userFacade} from "../facades/userFacade.js";
import auditService from '../../audit-module/services/auditService.js';

const logger = createLogger("user-controller");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const userControllerFactory = (fastify) => ({
    getAllDriverApplications: async (req, reply) => {
        try {
            const applications = await userFacade.findAllDriverApplications();
            return reply.send({applications});
        } catch (error) {
            return reply.status(500).send({
                error: "Failed to fetch applications",
                message: error.message,
            });
        }
    },

    reviewDriverApplication: async (req, reply) => {
        const {id} = req.params;
        const {status, comments} = req.body;
        if (!["approved", "rejected"].includes(status)) {
            return reply.status(400).send({error: "Invalid status"});
        }
        try {
            const application = await userFacade.findDriverApplicationById(id);
            if (!application) {
                return reply.status(404).send({error: "Application not found"});
            }
            application.status = status;
            application.comments = comments;
            await userFacade.saveDriverApplication(application);
            if (status === "approved" && application.passengerProfile) {
                const userId = application.passengerProfile.userId;
                let driver = await userFacade.findDriverProfileByUserId(userId);
                if (!driver) {
                    driver = await userFacade.createDriverProfile({userId, statusProfil: "Active"});
                } else {
                    driver.statusProfil = "Active";
                    await userFacade.saveUser(driver);
                }
            }
            return reply.send({application});
        } catch (error) {
            return reply.status(500).send({
                error: "Failed to review application",
                message: error.message,
            });
        }
    },
    getAllUsers: async (req, reply) => {
        logger.info("getAllUsers endpoint called");
        try {
            logger.debug("Attempting to retrieve all users from database");
            const users = await userFacade.findAllUsers();
            logger.info(`Retrieved ${users.length} users successfully`);
            logger.debug(`User data: ${JSON.stringify(users)}`);
            // Audit log for viewing all users
            auditService.logAction({
                entityType: 'user',
                entityId: null,
                action: 'view',
                description: `Viewed all users (${users.length})`,
                ipAddress: req.ip
            });
            return reply.send(users);
        } catch (error) {
            logger.error(`Error retrieving users: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: "Failed to retrieve users"});
        }
    },
    getUserById: async (req, reply) => {
        const {id} = req.params;
        logger.info(`getUserById called for user ID: ${id}`);
        try {
            const user = await userFacade.getUserByIdWithProfiles(id);
            if (!user) {
                logger.warn(`No user found with ID: ${id}`);
                return reply.status(404).send({error: "User not found"});
            }
            logger.info(`User ${id} found successfully`);
            return reply.send({user});
        } catch (error) {
            logger.error(`Error retrieving user ${id}: ${error.message}`);
            return reply.status(500).send({error: "Failed to retrieve user"});
        }
    },

    requestLoginOtp: async (req, reply) => {
        const {phoneNumber, email} = req.body;
        if (!phoneNumber && !email) {
            logger.warn("Phone number or email is missing in request");
            return reply.status(400).send({error: "Phone number or email are required"});
        }
        if (email && !email.endsWith("@tyvaa.live")) {
            logger.warn(`Invalid email domain for email: ${email}`);
            return reply.status(400).send({error: "Invalid email domain"});
        }
        try {
            const result = await userFacade.requestLoginOtp({phoneNumber, email, generateOTP});
            if (result.error) {
                logger.warn(result.error);
                return reply.status(404).send({error: result.error});
            }
            // TODO: Send OTP via SMS/email in production
            logger.info(`OTP generated for login: ${result.otp}`);
            return reply.send({success: true, otp: result.otp});
        } catch (error) {
            logger.error(`Error requesting login OTP: ${error.message}`);
            return reply.status(500).send({error: "Failed to request OTP", message: error.message});
        }
    },

    login: async (req, reply) => {
        const {phoneNumber, email, otp} = req.body;
        if (!phoneNumber && !email) {
            logger.warn("Phone number or email is missing in login request");
            return reply.status(400).send({error: "Phone number or email are required"});
        }
        if (email && !email.endsWith("@tyvaa.live")) {
            logger.warn(`Invalid email domain for email: ${email}`);
            return reply.status(400).send({error: "Invalid email domain"});
        }
        if (!otp) {
            logger.warn("OTP is missing in login request");
            return reply.status(400).send({error: "OTP is required"});
        }
        try {
            const result = await userFacade.loginWithOtp({phoneNumber, email, otp});
            if (result.error) {
                logger.warn(result.error);
                return reply.status(401).send({error: result.error});
            }
            const user = result.user;
            const token = fastify.signToken({
                id: user.id,
                phoneNumber: user.phoneNumber,
                email: user.email,
                isAdmin: user.isAdmin,
            });
            logger.info(`Login successful for user ${user.id}`);
            return reply.send({user, token});
        } catch (error) {
            logger.error(`Login error: ${error.message}`);
            return reply.status(500).send({error: "Login failed", message: error.message});
        }
    },

    requestRegisterOtp: async (req, reply) => {
        const {phoneNumber, email} = req.body;
        if (!phoneNumber && !email) {
            logger.warn("Phone number or email is missing in request");
            return reply.status(400).send({error: "Phone number or email are required"});
        }
        try {
            const result = await userFacade.requestRegisterOtp({phoneNumber, email, generateOTP});
            if (result.error) {
                logger.warn(result.error);
                return reply.status(400).send({error: result.error});
            }
            // TODO: Send OTP via SMS/email in production
            logger.info(`OTP generated for registration: ${result.otp}`);
            return reply.send({success: true, otp: result.otp});
        } catch (error) {
            logger.error(`Error requesting register OTP: ${error.message}`);
            return reply.status(500).send({error: "Failed to request OTP", message: error.message});
        }
    },

    createUser: async (req, reply) => {
        const {phoneNumber, fullName, dateOfBirth, sexe, email, otp, profileType} = req.body;
        if (!phoneNumber && !email) {
            logger.warn("Phone number or email is missing in registration request");
            return reply.status(400).send({error: "Phone number or email are required"});
        }
        if (!otp) {
            logger.warn("OTP is missing in registration request");
            return reply.status(400).send({error: "OTP is required"});
        }
        try {
            const userData = {phoneNumber, fullName, dateOfBirth, sexe, email};
            const result = await userFacade.registerWithOtp({phoneNumber, email, otp, userData});
            if (result.error) {
                logger.warn(result.error);
                return reply.status(400).send({error: result.error});
            }
            const user = result.user;
            if (profileType === "driver") {
                await userFacade.createDriverProfile({userId: user.id, statusProfil: "Active"});
            } else if (profileType === "passenger") {
                await userFacade.createPassengerProfile({userId: user.id});
            }
            const token = fastify.signToken({id: user.id, phoneNumber: user.phoneNumber, isAdmin: user.isAdmin});
            logger.info(`User created successfully with ID: ${user.id}`);
            return reply.status(201).send({user, token});
        } catch (error) {
            logger.error(`Error creating user: ${error.message}`);
            return reply.status(500).send({error: "Failed to create user", message: error.message});
        }
    },
    updateUser: async (req, reply) => {
        const {id} = req.params;
        logger.info(`Updating user with ID: ${id}`);
        const parts = req.parts();
        const fields = {};
        let profileImageBuffer = null;
        let profileImageFilename = null;
        for await (const part of parts) {
            if (part.file) {
                if (part.fieldname === "profile_image") {
                    logger.debug(`Received profile image file: ${part.filename}`);
                    profileImageFilename = part.filename;
                    profileImageBuffer = await part.toBuffer();
                }
            } else {
                fields[part.fieldname] = part.value;
            }
        }
        try {
            const uploadDir = path.join(__dirname, "..", "uploads");
            const user = await userFacade.updateUserProfileImage(id, fields, profileImageBuffer, profileImageFilename, uploadDir);
            if (!user) {
                logger.warn(`Update failed: No user found with ID ${id}`);
                return reply.status(404).send({error: "User not found"});
            }
            return reply.send({user});
        } catch (err) {
            logger.error(`Error updating user ${id}: ${err.message}`);
            return reply.status(500).send({error: "Server error"});
        }
    },

    updateFcmToken: async (req, reply) => {
        const id = req.user.id;
        const {fcmToken} = req.body;
        logger.info(`Updating FCM token for user ${id}`);
        logger.debug(`New FCM token: ${fcmToken}`);
        try {
            const result = await userFacade.updateFcmTokenFacade(id, fcmToken);
            if (result.error) {
                logger.warn(`Update failed: ${result.error}`);
                return reply.status(404).send({error: result.error});
            }
            logger.info(`FCM token updated successfully for user ${id}`);
            logger.debug(`Updated user data: ${JSON.stringify(result.user)}`);
            return reply.send({user: result.user});
        } catch (error) {
            logger.error(`Error updating FCM token for user ${id}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: "Failed to update FCM token"});
        }
    },

    updateLocation: async (req, reply) => {
        const id = req.user.id;
        const {location} = req.body;
        logger.info(`Updating location for user ${id}`);
        logger.debug(`New location data: ${JSON.stringify(location)}`);
        try {
            const result = await userFacade.updateLocationFacade(id, location);
            if (result.error) {
                logger.warn(`Update failed: ${result.error}`);
                return reply.status(404).send({error: result.error});
            }
            logger.info(`Location updated successfully for user ${id}`);
            logger.debug(`Updated user data: ${JSON.stringify(result.user)}`);
            return reply.send({success: true, user: result.user, message: "Location updated successfully"});
        } catch (error) {
            logger.error(`Error updating location for user ${id}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: "Failed to update location"});
        }
    },

    deleteUser: async (req, reply) => {
        const {id} = req.params;
        logger.info(`Deleting user with ID: ${id}`);
        try {
            const result = await userFacade.deleteUserFacade(id);
            if (result.error) {
                logger.warn(`Deletion failed: ${result.error}`);
                return reply.status(404).send({error: result.error});
            }
            logger.info(`User ${id} deleted successfully`);
            return reply.status(204).send();
        } catch (error) {
            logger.error(`Error deleting user ${id}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: "Failed to delete user"});
        }
    },

    blockUser: async (req, reply) => {
        const {id} = req.params;
        logger.info(`Blocking user with ID: ${id}`);
        try {
            const result = await userFacade.blockUserFacade(id);
            if (result.error) {
                logger.warn(`Block failed: ${result.error}`);
                return reply.status(404).send({error: result.error});
            }
            logger.info(`User ${id} blocked successfully`);
            return reply.send(result.user);
        } catch (e) {
            logger.error(`Error blocking user ${id}: ${e.message}`);
            return reply.status(500).send({error: "Failed to block user"});
        }
    },

    submitDriverApplication: async (req, reply) => {
        const userId = req.user.id;
        try {
            const uploadDir = path.join(__dirname, "..", "uploads");
            const result = await userFacade.submitDriverApplication({
                userId,
                parts: req.parts(),
                uploadDir,
                pump,
                fs,
                path
            });
            if (result.error) {
                return reply.status(400).send({error: result.error});
            }
            return reply.status(201).send({application: result.application});
        } catch (error) {
            logger.error(`Error in submitDriverApplication: ${error.message}`);
            logger.debug(error.stack);
            return reply.status(500).send({error: "Failed to submit application", message: error.message});
        }
    },

    getDriverApplicationStatus: async (req, reply) => {
        const userId = req.user.id;
        try {
            const result = await userFacade.getDriverApplicationStatus(userId);
            return reply.send(result);
        } catch (error) {
            logger.error(`Error fetching driver application status: ${error.message}`);
            return reply.status(500).send({error: "Failed to fetch application status", message: error.message});
        }
    },

});

function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    logger.debug(`Generated OTP: ${otp}`);
    return otp;
}
