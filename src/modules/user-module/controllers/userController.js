import { userFacade } from "./../facades/userFacade.js";
import createLogger from "#utils/logger.js";
import {
    NotFoundError,
    BadRequestError,
    AuthenticationError,
} from "#utils/customErrors.js";

/**
 * @file User controller for handling regular user operations and driver applications.
 * @typedef {import('fastify').FastifyInstance & { signToken: (payload: object) => string }} FastifyAugmentedInstance
 * @typedef {import('fastify').FastifyRequest} FastifyRequest
 * @typedef {import('fastify').FastifyReply} FastifyReply
 */

const logger = createLogger("user-controller");

/**
 * Factory function to create user controller methods.
 * @param {FastifyAugmentedInstance} fastify - The Fastify instance, augmented with `signToken`.
 * @returns {object} User controller methods.
 */
export const userControllerFactory = (fastify) => ({
    /**
     * Retrieves all driver applications. (Admin operation)
     * @async
     * @param {FastifyRequest} request
     * @param {FastifyReply} reply
     */
    getAllDriverApplications: async (request, reply) => {
        const applications = await userFacade.getAllDriverApplications();
        logger.info("Fetched all driver applications", {
            count: applications.length,
        });
        return reply.send({ success: true, data: applications });
    },

    /**
     * Reviews a driver application, updating its status. (Admin operation)
     * @async
     * @param {FastifyRequest<{ Params: {id: string}, Body: {status: 'approved'|'rejected', comments?: string} }>} request
     * @param {FastifyReply} reply
     */
    reviewDriverApplication: async (request, reply) => {
        const { id } = request.params;
        const { status, comments } = request.body;

        // Basic validation, schema should ideally handle this
        if (!["approved", "rejected"].includes(status)) {
            throw new BadRequestError(
                "Invalid status provided for review. Must be 'approved' or 'rejected'."
            );
        }

        const application = await userFacade.reviewDriverApplication(
            id,
            status,
            comments
        );
        logger.info(`Reviewed driver application ID: ${id}, Status: ${status}`);
        return reply.send({ success: true, data: application });
    },

    /**
     * Retrieves all users. (Typically an Admin operation)
     * @async
     * @param {FastifyRequest} request
     * @param {FastifyReply} reply
     */
    getAllUsers: async (request, reply) => {
        const users = await userFacade.getAllUsers();
        logger.info("Fetched all users", { count: users.length });
        return reply.send({ success: true, data: users });
    },

    /**
     * Retrieves a user by their ID.
     * @async
     * @param {FastifyRequest<{Params: {id: string}}>} request
     * @param {FastifyReply} reply
     */
    getUserById: async (request, reply) => {
        const { id } = request.params;
        const user = await userFacade.getUserById(id);
        if (!user) {
            throw new NotFoundError(`User with ID ${id} not found.`);
        }
        logger.info("Fetched user by ID", { id });
        return reply.send({ success: true, data: user });
    },

    /**
     * Requests an OTP for user login.
     * @async
     * @param {FastifyRequest<{Body: {phoneNumber?: string, email?: string}} >} request
     * @param {FastifyReply} reply
     */
    requestLoginOtp: async (request, reply) => {
        try {
            const { phoneNumber, email } = request.body;
            if (!phoneNumber && !email) {
                return reply
                    .status(400)
                    .send({ error: "Phone number or email are required" });
            }
            // Only allow @tyvaa.live domain for email
            if (email && !email.endsWith("@tyvaa.live")) {
                return reply
                    .status(400)
                    .send({ error: "Invalid email domain" });
            }
            const result = await userFacade.requestLoginOtp({
                phoneNumber,
                email,
            });
            // If OTP is returned, send it (for test), else just success
            if (result && result.otp) {
                return reply.send({ success: true, otp: result.otp });
            }
            return reply.send({
                success: true,
                message: "OTP has been sent to your registered contact.",
            });
        } catch (err) {
            return reply.status(401).send({ error: err.message });
        }
    },
    /**
     * Logs in a user with phone/email and OTP.
     * @async
     * @param {FastifyRequest<{Body: {phoneNumber?: string, email?: string, otp: string}} >} request
     * @param {FastifyReply} reply
     */
    login: async (request, reply) => {
        try {
            const { phoneNumber, email, otp } = request.body;
            if (!phoneNumber && !email) {
                return reply
                    .status(400)
                    .send({ error: "Phone number or email are required" });
            }
            if (!otp) {
                return reply.status(400).send({ error: "OTP is required" });
            }
            if (email && !email.endsWith("@tyvaa.live")) {
                return reply
                    .status(400)
                    .send({ error: "Invalid email domain" });
            }
            let user;
            try {
                user = await userFacade.login({ phoneNumber, email, otp });
            } catch (err) {
                if (err.message === "Invalid OTP") {
                    return reply.status(401).send({ error: "Invalid OTP" });
                }
                if (err.message === "not found") {
                    return reply.status(404).send({ error: "not found" });
                }
                return reply.status(500).send({ error: err.message });
            }
            if (!user) {
                return reply.status(404).send({ error: "User not found" });
            }
            const token = fastify.signToken({ id: user.id });
            return reply.send({ user, token });
        } catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    },

    /**
     * Requests an OTP for user registration.
     * @async
     * @param {FastifyRequest<{Body: {phoneNumber: string}} >} request
     * @param {FastifyReply} reply
     */
    requestRegisterOtp: async (request, reply) => {
        try {
            const { phoneNumber } = request.body;
            const otp = await userFacade.requestRegisterOtp(phoneNumber);
            return reply.send({ success: true, otp });
        } catch (err) {
            return reply.status(400).send({ error: err.message });
        }
    },

    /**
     * Creates a new user after OTP verification.
     * @async
     * @param {FastifyRequest<{Body: object}>} request - Body contains user data including OTP.
     * @param {FastifyReply} reply
     */
    createUser: async (request, reply) => {
        try {
            const userData = request.body;
            let user;
            try {
                user = await userFacade.createUser(userData);
            } catch (err) {
                if (err.message === "User already exists") {
                    return reply
                        .status(400)
                        .send({ error: "User already exists" });
                }
                if (err.message === "Invalid OTP") {
                    return reply.status(400).send({ error: "Invalid OTP" });
                }
                return reply.status(500).send({ error: err.message });
            }
            const token = fastify.signToken({ id: user.id });
            return reply.status(201).send({ user, token });
        } catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    },

    /**
     * Updates a user's profile, potentially including a profile image.
     * @async
     * @param {FastifyRequest<{Params: {id: string}}> } request - Multipart request.
     * @param {FastifyReply} reply
     * @todo Refactor file handling to use @fastify/multipart properly and move parsing to facade/service.
     */
    updateUser: async (request, reply) => {
        try {
            const { id } = request.params;
            request.log.warn(
                "updateUser: Manual multipart parsing is in use and needs refactoring."
            );
            const parts = request.parts();
            const fields = {};
            let fileData = null;
            for await (const part of parts) {
                if (part.file && part.fieldname === "profile_image") {
                    fileData = {
                        buffer: await part.toBuffer(),
                        filename: part.filename,
                        mimetype: part.mimetype,
                    };
                } else if (part.fieldname) {
                    fields[part.fieldname] = part.value;
                }
            }
            const user = await userFacade.updateUser(id, fields, fileData);
            return reply.send({
                success: true,
                message: "Profile updated successfully.",
                data: user,
            });
        } catch (err) {
            if (err.message === "User not found") {
                return reply.status(404).send({ error: "User not found" });
            }
            return reply.status(500).send({ error: err.message });
        }
    },

    /**
     * Deletes a user.
     * @async
     * @param {FastifyRequest<{Params: {id: string}}>} request
     * @param {FastifyReply} reply
     */
    deleteUser: async (request, reply) => {
        try {
            const { id } = request.params;
            await userFacade.deleteUser(id);
            return reply.status(204).send();
        } catch (err) {
            if (err.message === "User not found") {
                return reply.status(404).send({ error: "User not found" });
            }
            return reply.status(500).send({ error: err.message });
        }
    },

    /**
     * Updates a user's FCM token. (Authenticated route)
     * @async
     * @param {FastifyRequest<{Body: {fcmToken: string}}>} request
     * @param {FastifyReply} reply
     */
    updateFcmToken: async (request, reply) => {
        try {
            const userId = request.user.id;
            const { fcmToken } = request.body;
            const user = await userFacade.updateFcmToken(userId, fcmToken);
            return reply.send({
                success: true,
                message: "FCM token updated.",
                data: user,
            });
        } catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    },

    /**
     * Updates a user's location. (Authenticated route)
     * @async
     * @param {FastifyRequest<{Body: {location: {latitude: number, longitude: number}}} >} request
     * @param {FastifyReply} reply
     */
    updateLocation: async (request, reply) => {
        try {
            const userId = request.user.id;
            const { location } = request.body;
            const user = await userFacade.updateLocation(userId, location);
            return reply.send({
                success: true,
                message: "Location updated successfully.",
                data: user,
            });
        } catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    },

    /**
     * Submits a driver application. (Authenticated route)
     * @async
     * @param {FastifyRequest} request - Multipart request.
     * @param {FastifyReply} reply
     * @todo Refactor file handling.
     */
    submitDriverApplication: async (request, reply) => {
        try {
            const userId = request.user.id;
            request.log.warn(
                "submitDriverApplication: Manual multipart parsing is in use and needs refactoring."
            );
            let application;
            try {
                application = await userFacade.submitDriverApplication(
                    userId,
                    request.parts()
                );
            } catch (err) {
                if (err.message === "required") {
                    return reply.status(400).send({ error: "required" });
                }
                return reply.status(500).send({ error: err.message });
            }
            return reply.status(201).send({
                success: true,
                message: "Driver application submitted.",
                data: application,
            });
        } catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    },

    /**
     * Retrieves the status of the current user's driver application. (Authenticated route)
     * @async
     * @param {FastifyRequest} request
     * @param {FastifyReply} reply
     */
    getDriverApplicationStatus: async (request, reply) => {
        try {
            const userId = request.user.id;
            const applicationStatus =
                await userFacade.getDriverApplicationStatus(userId);
            return reply.send({ success: true, data: applicationStatus });
        } catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    },

    /**
     * Blocks a user. (Admin operation)
     * @async
     * @param {FastifyRequest<{Params: {id: string}}>} request
     * @param {FastifyReply} reply
     */
    blockUser: async (request, reply) => {
        try {
            const { id } = request.params;
            let user;
            try {
                user = await userFacade.blockUser(id);
            } catch (err) {
                if (err.message === "User not found") {
                    return reply.status(404).send({ error: "User not found" });
                }
                return reply.status(500).send({ error: err.message });
            }
            return reply.send({
                success: true,
                message: "User blocked successfully.",
                data: user,
            });
        } catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    },
});
