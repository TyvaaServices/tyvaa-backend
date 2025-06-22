import {
    DriverApplication,
    DriverProfile,
    User,
    PassengerProfile // <-- Added import
} from "#config/index.js";
import {userService} from "./../services/userService.js";
import createLogger from "#utils/logger.js";

const logger = createLogger("user-facade");

export const userFacade = {
    getAllDriverApplications: async () => {
        try {
            const result = await DriverApplication.findAll({
                include: [{
                    model: PassengerProfile,
                    as: "passengerProfile",
                    include: [{model: User, as: "user", attributes: {exclude: ["fcmToken"]}}],
                }],
            });
            logger.info("Fetched all driver applications", { count: result.length });
            return result;
        } catch (error) {
            logger.error("Failed to fetch driver applications", { error: error.message });
            throw error;
        }
    },

    reviewDriverApplication: async (id, status, comments) => {
        try {
            const application = await DriverApplication.findByPk(id, {
                include: [{model: PassengerProfile, as: "passengerProfile"}],
            });
            if (!application) {
                logger.warn("Application not found", { id });
                return null;
            }
            application.status = status;
            application.comments = comments;
            await application.save();
            if (status === "approved" && application.passengerProfile) {
                const userId = application.passengerProfile.userId;
                let driver = await DriverProfile.findOne({where: {userId}});
                if (!driver) {
                    await DriverProfile.create({userId, statusProfil: "Active"});
                } else {
                    driver.statusProfil = "Active";
                    await driver.save();
                }
            }
            logger.info("Reviewed driver application", { id, status });
            return application;
        } catch (error) {
            logger.error("Failed to review driver application", { id, error: error.message });
            throw error;
        }
    },

    getAllUsers: async () => {
        try {
            const users = await User.findAll();
            logger.info("Fetched all users", { count: users.length });
            return users;
        } catch (error) {
            logger.error("Failed to fetch users", { error: error.message });
            throw error;
        }
    },

    getUserById: async (id) => {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                logger.warn("User not found", { id });
                return null;
            }
            logger.info("Fetched user by id", { id });
            return user;
        } catch (error) {
            logger.error("Failed to fetch user by id", { id, error: error.message });
            throw error;
        }
    },

    requestLoginOtp: async (contact) => {
        try {
            const user = await userService.findUserByPhoneOrEmail(contact);
            if (!user) {
                logger.warn("User not found for login OTP", { contact });
                return null;
            }
            const otp = await userService.generateAndStoreOtp(contact.phoneNumber || contact.email);
            logger.info("Generated login OTP", { contact });
            return {user, otp};
        } catch (error) {
            logger.error("Failed to request login OTP", { contact, error: error.message });
            throw error;
        }
    },

    login: async ({phoneNumber, email, otp}) => {
        try {
            const identifier = email || phoneNumber;
            const user = await userService.findUserByPhoneOrEmail({email, phoneNumber});
            if (!user) {
                logger.warn("User not found for login", { phoneNumber, email });
                return null;
            }
            await userService.verifyOtp(identifier, otp);
            logger.info("User logged in", { id: user.id });
            return user;
        } catch (error) {
            logger.warn("Login failed", { phoneNumber, email, error: error.message });
            throw error;
        }
    },

    requestRegisterOtp: async (phoneNumber) => {
        try {
            const user = await User.findOne({where: {phoneNumber}});
            if (user) {
                logger.warn("User already exists for register OTP", { phoneNumber });
                return null;
            }
            const otp = await userService.generateAndStoreOtp(phoneNumber);
            logger.info("Generated register OTP", { phoneNumber });
            return otp;
        } catch (error) {
            logger.error("Failed to request register OTP", { phoneNumber, error: error.message });
            throw error;
        }
    },

    createUser: async (userData) => {
        try {
            await userService.verifyOtp(userData.phoneNumber, userData.otp);
            const user = await userService.createUserWithProfile(userData);
            logger.info("User created", { id: user.id });
            return user;
        } catch (error) {
            logger.warn("Failed to create user", { phoneNumber: userData.phoneNumber, error: error.message });
            throw error;
        }
    },

    updateUser: async (id, fields, file) => {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                logger.warn("User not found for update", { id });
                return null;
            }
            Object.entries(fields).forEach(([key, value]) => {
                if (key in user) user[key] = value;
            });
            if (file?.buffer && file.filename) {
                user.profileImage = userService.saveProfileImage(file);
            }
            await user.save();
            logger.info("User updated", { id });
            return user;
        } catch (error) {
            logger.error("Failed to update user", { id, error: error.message });
            throw error;
        }
    },

    deleteUser: async (id) => {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                logger.warn("User not found for delete", { id });
                return false;
            }
            await user.destroy();
            logger.info("User deleted", { id });
            return true;
        } catch (error) {
            logger.error("Failed to delete user", { id, error: error.message });
            throw error;
        }
    },

    updateFcmToken: async (id, fcmToken) => {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                logger.warn("User not found for FCM token update", { id });
                return null;
            }
            user.fcmToken = fcmToken;
            await user.save();
            logger.info("Updated FCM token", { id });
            return user;
        } catch (error) {
            logger.error("Failed to update FCM token", { id, error: error.message });
            throw error;
        }
    },

    updateLocation: async (id, location) => {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                logger.warn("User not found for location update", { id });
                return null;
            }
            user.latitude = location.latitude;
            user.longitude = location.longitude;
            await user.save();
            logger.info("Updated user location", { id });
            return user;
        } catch (error) {
            logger.error("Failed to update user location", { id, error: error.message });
            throw error;
        }
    },

    submitDriverApplication: async (userId, parts) => {
        try {
            const passenger = await userService.findPassengerProfile(userId);
            if (!passenger) {
                logger.warn("Passenger profile not found for driver application", { userId });
                return null;
            }
            const existing = await DriverApplication.findOne({
                where: {userId: passenger.id, status: "pending"},
            });
            if (existing) {
                logger.warn("Pending driver application exists", { userId });
                return null;
            }
            const pdfPath = await userService.savePdfFromParts(parts, userId);
            const result = await DriverApplication.create({
                userId: passenger.id,
                documents: pdfPath,
            });
            logger.info("Submitted driver application", { userId });
            return result;
        } catch (error) {
            logger.error("Failed to submit driver application", { userId, error: error.message });
            throw error;
        }
    },

    getDriverApplicationStatus: async (userId) => {
        try {
            const passenger = await userService.findPassengerProfile(userId);
            if (!passenger) {
                logger.info("No passenger profile for driver application status", { userId });
                return {status: "none", comments: null};
            }
            const application = await DriverApplication.findOne({
                where: {userId: passenger.id},
                order: [["createdAt", "DESC"]],
            });
            if (!application) {
                logger.info("No driver application found", { userId });
                return {status: "none", comments: null};
            }
            logger.info("Fetched driver application status", { userId, status: application.status });
            return {status: application.status, comments: application.comments || null};
        } catch (error) {
            logger.error("Failed to fetch driver application status", { userId, error: error.message });
            throw error;
        }
    },

    blockUser: async (id) => {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                logger.warn("User not found for block", { id });
                return null;
            }
            user.isBlocked = true;
            await user.save();
            logger.info("Blocked user", { id });
            return user;
        } catch (error) {
            logger.error("Failed to block user", { id, error: error.message });
            throw error;
        }
    },
};
