import { userFacade } from "./../facades/userFacade.js";
import createLogger from "#utils/logger.js";

const logger = createLogger("user-controller");

export const userControllerFactory = (fastify) => ({
    getAllDriverApplications: async (req, reply) => {
        try {
            const applications = await userFacade.getAllDriverApplications();
            logger.info("Fetched all driver applications", { count: applications.length });
            return reply.send({ applications });
        } catch (error) {
            logger.error("Failed to fetch driver applications", { error: error.message });
            return reply.status(500).send({ error: "Failed to fetch applications", message: error.message });
        }
    },

    reviewDriverApplication: async (req, reply) => {
        const { id } = req.params;
        const { status, comments } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return reply.status(400).send({ error: "Invalid status" });
        }

        try {
            const application = await userFacade.reviewDriverApplication(id, status, comments);
            logger.info("Reviewed driver application", { id, status });
            return reply.send({ application });
        } catch (error) {
            logger.error("Failed to review driver application", { id, error: error.message });
            return reply.status(error.message === "Application not found" ? 404 : 500).send({
                error: "Failed to review application",
                message: error.message,
            });
        }
    },

    getAllUsers: async (req, reply) => {
        try {
            const users = await userFacade.getAllUsers();
            logger.info("Fetched all users", { count: users.length });
            return reply.send(users);
        } catch (error) {
            logger.error("Failed to retrieve users", { error: error.message });
            return reply.status(500).send({ error: "Failed to retrieve users" });
        }
    },

    getUserById: async (req, reply) => {
        const { id } = req.params;
        try {
            const user = await userFacade.getUserById(id);
            if (!user) {
                logger.warn("User not found", { id });
                return reply.status(404).send({ error: "User not found" });
            }
            logger.info("Fetched user by id", { id });
            return reply.send({ user });
        } catch (error) {
            logger.error("Failed to retrieve user", { id, error: error.message });
            return reply.status(500).send({ error: "Failed to retrieve user" });
        }
    },

    requestLoginOtp: async (req, reply) => {
        const { phoneNumber, email } = req.body;
        if (!phoneNumber && !email) return reply.status(400).send({ error: "Phone number or email are required" });
        if (email && !email.endsWith("@tyvaa.live")) return reply.status(400).send({ error: "Invalid email domain" });

        try {
            const { otp } = await userFacade.requestLoginOtp({ phoneNumber, email });
            logger.info("Requested login OTP", { phoneNumber, email });
            return reply.send({ success: true, otp });
        } catch (error) {
            logger.warn("Failed to request login OTP", { phoneNumber, email, error: error.message });
            return reply.status(404).send({ error: error.message });
        }
    },

    login: async (req, reply) => {
        const { phoneNumber, email, otp } = req.body;
        if (!phoneNumber && !email) return reply.status(400).send({ error: "Phone number or email are required" });
        if (!otp) return reply.status(400).send({ error: "OTP is required" });
        if (email && !email.endsWith("@tyvaa.live")) return reply.status(400).send({ error: "Invalid email domain" });

        try {
            const user = await userFacade.login({ phoneNumber, email, otp });
            const token = fastify.signToken({
                id: user.id,
                phoneNumber: user.phoneNumber,
                email: user.email,
                isDriver: user.isDriver,
            });
            logger.info("User logged in", { id: user.id });
            return reply.send({ user, token });
        } catch (error) {
            logger.warn("Login failed", { phoneNumber, email, error: error.message });
            const status = error.message === "Invalid OTP" ? 401 : 404;
            return reply.status(status).send({ error: error.message });
        }
    },

    requestRegisterOtp: async (req, reply) => {
        const { phoneNumber } = req.body;
        try {
            const otp = await userFacade.requestRegisterOtp(phoneNumber);
            logger.info("Requested register OTP", { phoneNumber });
            return reply.send({ success: true, otp });
        } catch (error) {
            logger.warn("Failed to request register OTP", { phoneNumber, error: error.message });
            return reply.status(400).send({ error: error.message });
        }
    },

    createUser: async (req, reply) => {
        const userData = req.body;
        try {
            const user = await userFacade.createUser(userData);
            const token = fastify.signToken({ id: user.id, phoneNumber: user.phoneNumber });
            logger.info("User created", { id: user.id });
            return reply.status(201).send({ user, token });
        } catch (error) {
            logger.warn("Failed to create user", { phoneNumber: userData.phoneNumber, error: error.message });
            const status = error.message === "User already exists" || error.message === "Invalid OTP" ? 400 : 500;
            return reply.status(status).send({ error: error.message });
        }
    },

    updateUser: async (req, reply) => {
        const { id } = req.params;
        const parts = req.parts();
        const fields = {};
        let file = null;

        for await (const part of parts) {
            if (part.file && part.fieldname === "profile_image") {
                file = {
                    buffer: await part.toBuffer(),
                    filename: part.filename,
                };
            } else {
                fields[part.fieldname] = part.value;
            }
        }

        try {
            const user = await userFacade.updateUser(id, fields, file);
            logger.info("User updated", { id });
            return reply.send({ user });
        } catch (error) {
            logger.error("Failed to update user", { id, error: error.message });
            const status = error.message === "User not found" ? 404 : 500;
            return reply.status(status).send({ error: error.message });
        }
    },

    deleteUser: async (req, reply) => {
        const { id } = req.params;
        try {
            await userFacade.deleteUser(id);
            logger.info("User deleted", { id });
            return reply.status(204).send();
        } catch (error) {
            logger.error("Failed to delete user", { id, error: error.message });
            const status = error.message === "User not found" ? 404 : 500;
            return reply.status(status).send({ error: error.message });
        }
    },

    updateFcmToken: async (req, reply) => {
        const id = req.user.id;
        const { fcmToken } = req.body;
        try {
            const user = await userFacade.updateFcmToken(id, fcmToken);
            logger.info("Updated FCM token", { id });
            return reply.send({ user });
        } catch (error) {
            logger.error("Failed to update FCM token", { id, error: error.message });
            return reply.status(500).send({ error: error.message });
        }
    },

    updateLocation: async (req, reply) => {
        const id = req.user.id;
        const { location } = req.body;
        try {
            const user = await userFacade.updateLocation(id, location);
            logger.info("Updated user location", { id });
            return reply.send({ success: true, user, message: "Location updated successfully" });
        } catch (error) {
            logger.error("Failed to update user location", { id, error: error.message });
            return reply.status(500).send({ error: error.message });
        }
    },

    submitDriverApplication: async (req, reply) => {
        const userId = req.user.id;
        try {
            const application = await userFacade.submitDriverApplication(userId, req.parts());
            logger.info("Submitted driver application", { userId });
            return reply.status(201).send({ application });
        } catch (error) {
            logger.error("Failed to submit driver application", { userId, error: error.message });
            const status = error.message.includes("required") || error.message.includes("pending")
                ? 400
                : 500;
            return reply.status(status).send({ error: error.message });
        }
    },

    getDriverApplicationStatus: async (req, reply) => {
        const userId = req.user.id;
        try {
            const status = await userFacade.getDriverApplicationStatus(userId);
            logger.info("Fetched driver application status", { userId });
            return reply.send(status);
        } catch (error) {
            logger.error("Failed to fetch driver application status", { userId, error: error.message });
            return reply.status(500).send({ error: error.message });
        }
    },

    blockUser: async (req, reply) => {
        const { id } = req.params;
        try {
            const user = await userFacade.blockUser(id);
            logger.info("Blocked user", { id });
            return reply.send(user);
        } catch (error) {
            logger.error("Failed to block user", { id, error: error.message });
            const status = error.message === "User not found" ? 404 : 500;
            return reply.status(status).send({ error: error.message });
        }
    },
});
