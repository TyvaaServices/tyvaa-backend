const axios = require('axios');
const User = require('./../models/user');
const logger = require('./../utils/logger');

function generateOTP() {
    logger.info('Generating new OTP');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    logger.debug(`OTP generated: ${otp}`);
    return otp;
}

module.exports = {
    health: async (req, reply) => {
        logger.info('Health check endpoint called');
        const response = {status: 'user-service running'};
        logger.info(`Responding with: ${JSON.stringify(response)}`);
        return response;
    },

    getAllUsers: async (req, reply) => {
        logger.info('getAllUsers endpoint called');
        try {
            logger.debug('Attempting to retrieve all users from database');
            const users = await User.findAll();
            logger.info(`Retrieved ${users.length} users successfully`);
            logger.debug(`User data: ${JSON.stringify(users)}`);
            return reply.send({users});
        } catch (error) {
            logger.error(`Error retrieving users: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: 'Failed to retrieve users'});
        }
    },

    login: async (req, reply) => {
        const {phoneNumber} = req.body;
        logger.info(`Login attempt with phone number: ${phoneNumber}`);

        try {
            logger.debug(`Searching for user with phone number: ${phoneNumber}`);
            const user = await User.findOne({where: {phoneNumber}});

            if (!user) {
                logger.warn(`Login failed: No user found with phone number ${phoneNumber}`);
                return reply.status(404).send({error: 'User not found'});
            }

            logger.info(`User found with ID: ${user.id}`);
            logger.debug(`User data: ${JSON.stringify(user)}`);

            const otp = generateOTP();
            logger.info(`OTP generated for user ${user.id}: ${otp}`);

            logger.debug(`Making request to auth service at ${process.env.AUTH_SERVICE_URL}/api/v1/token`);
            logger.debug(`Auth service payload: ${JSON.stringify({id: user.id, phoneNumber: user.phoneNumber})}`);

            const response = await axios.post(`${process.env.AUTH_SERVICE_URL}/api/v1/token`, {
                id: user.id,
                phoneNumber: user.phoneNumber,
            });

            const token = response.data.token;
            logger.info(`Authentication token received for user ${user.id}`);
            logger.debug(`Token: ${token}`);

            logger.info(`Login successful for user ${user.id}`);
            return reply.send({user, otp, token});
        } catch (error) {
            logger.error(`Login error for phone number ${phoneNumber}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: 'Login failed', message: error.message});
        }
    },

    getUserById: async (req, reply) => {
        const {id} = req.params;
        logger.info(`getUserById called for user ID: ${id}`);

        try {
            logger.debug(`Searching for user with ID: ${id}`);
            const user = await User.findByPk(id);

            if (!user) {
                logger.warn(`No user found with ID: ${id}`);
                return reply.status(404).send({error: 'User not found'});
            }

            logger.info(`User ${id} found successfully`);
            logger.debug(`User data: ${JSON.stringify(user)}`);
            return reply.send({user});
        } catch (error) {
            logger.error(`Error retrieving user ${id}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: 'Failed to retrieve user'});
        }
    },

    createUser: async (req, reply) => {
        const {phoneNumber,fullName} = req.body;
        logger.info(`Creating new user with phone number: ${phoneNumber}`);

        try {
            logger.debug(`Checking if user already exists with phone number: ${phoneNumber}`);
            const existingUser = await User.findOne({where: {phoneNumber}});

            if (existingUser) {
                logger.warn(`User creation failed: User already exists with phone number ${phoneNumber}`);
                return reply.status(400).send({error: 'User already exists'});
            }

            logger.debug(`Creating new user with data: ${JSON.stringify(req.body)}`);
            const user = await User.create({phoneNumber,fullName});

            logger.info(`User created successfully with ID: ${user.id}`);
            logger.debug(`New user data: ${JSON.stringify(user)}`);
            const response = await axios.post(`${process.env.AUTH_SERVICE_URL}/api/v1/token`, {
                id: user.id,
                phoneNumber: user.phoneNumber,
            });

            const token = response.data.token;

            const otp = generateOTP();

            return reply.status(201).send({user, otp, token});
        } catch (error) {
            logger.error(`Error creating user with phone ${phoneNumber}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: 'Failed to create user'});
        }
    },

    updateUser: async (req, reply) => {
        const {id} = req.params;
        logger.info(`Updating user with ID: ${id}`);
        logger.debug(`Update payload: ${JSON.stringify(req.body)}`);

        const {
            phoneNumber,
            fullName,
            fcmToken,
            driverLicense,
            isOnline,
            carImage,
            isDriver,
            isVerified,
            isBlocked,
        } = req.body;

        try {
            logger.debug(`Looking up user with ID: ${id}`);
            const user = await User.findByPk(id);

            if (!user) {
                logger.warn(`Update failed: No user found with ID ${id}`);
                return reply.status(404).send({error: 'User not found'});
            }

            logger.debug(`User found, current data: ${JSON.stringify(user)}`);
            logger.debug('Updating user fields');

            if (phoneNumber !== undefined) {
                logger.debug(`Updating phoneNumber from ${user.phoneNumber} to ${phoneNumber}`);
                user.phoneNumber = phoneNumber;
            }
            if (fullName !== undefined) {
                logger.debug(`Updating fullName from ${user.fullName} to ${fullName}`);
                user.fullName = fullName;
            }
            if (fcmToken !== undefined) {
                logger.debug(`Updating fcmToken to new value`);
                user.fcmToken = fcmToken;
            }
            if (driverLicense !== undefined) {
                logger.debug(`Updating driverLicense from ${user.driverLicense} to ${driverLicense}`);
                user.driverLicense = driverLicense;
            }
            if (isOnline !== undefined) {
                logger.debug(`Updating isOnline from ${user.isOnline} to ${isOnline}`);
                user.isOnline = isOnline;
            }
            if (carImage !== undefined) {
                logger.debug(`Updating carImage to new value`);
                user.carImage = carImage;
            }
            if (isDriver !== undefined) {
                logger.debug(`Updating isDriver from ${user.isDriver} to ${isDriver}`);
                user.isDriver = isDriver;
            }
            if (isVerified !== undefined) {
                logger.debug(`Updating isVerified from ${user.isVerified} to ${isVerified}`);
                user.isVerified = isVerified;
            }
            if (isBlocked !== undefined) {
                logger.debug(`Updating isBlocked from ${user.isBlocked} to ${isBlocked}`);
                user.isBlocked = isBlocked;
            }

            logger.debug('Saving updated user data to database');
            await user.save();

            logger.info(`User ${id} updated successfully`);
            logger.debug(`Updated user data: ${JSON.stringify(user)}`);
            return reply.send({user});
        } catch (err) {
            logger.error(`Error updating user ${id}: ${err.message}`);
            logger.debug(`Error stack: ${err.stack}`);
            return reply.status(500).send({error: 'Server error'});
        }
    },

    deleteUser: async (req, reply) => {
        const {id} = req.params;
        logger.info(`Deleting user with ID: ${id}`);

        try {
            logger.debug(`Looking up user with ID: ${id}`);
            const user = await User.findByPk(id);

            if (!user) {
                logger.warn(`Deletion failed: No user found with ID ${id}`);
                return reply.status(404).send({error: 'User not found'});
            }

            logger.debug(`User found, proceeding with deletion of user ${id}`);
            await user.destroy();

            logger.info(`User ${id} deleted successfully`);
            return reply.status(204).send();
        } catch (error) {
            logger.error(`Error deleting user ${id}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: 'Failed to delete user'});
        }
    },

    updateFcmToken: async (req, reply) => {
        const {id} = req.params;
        const {fcmToken} = req.body;
        logger.info(`Updating FCM token for user ${id}`);
        logger.debug(`New FCM token: ${fcmToken}`);

        try {
            logger.debug(`Looking up user with ID: ${id}`);
            const user = await User.findByPk(id);

            if (!user) {
                logger.warn(`Update failed: No user found with ID ${id}`);
                return reply.status(404).send({error: 'User not found'});
            }

            logger.debug(`User found, updating FCM token for user ${id}`);
            user.fcmToken = fcmToken;
            await user.save();

            logger.info(`FCM token updated successfully for user ${id}`);
            logger.debug(`Updated user data: ${JSON.stringify(user)}`);
            return reply.send({user});
        } catch (error) {
            logger.error(`Error updating FCM token for user ${id}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: 'Failed to update FCM token'});
        }
    },

    updateLocation: async (req, reply) => {
        const {id} = req.params;
        const {location} = req.body;
        logger.info(`Updating location for user ${id}`);
        logger.debug(`New location data: ${JSON.stringify(location)}`);

        try {
            logger.debug(`Looking up user with ID: ${id}`);
            const user = await User.findByPk(id);

            if (!user) {
                logger.warn(`Update failed: No user found with ID ${id}`);
                return reply.status(404).send({error: 'User not found'});
            }

            logger.debug(`User found, updating location for user ${id}`);
            logger.debug(`Previous location - lat: ${user.latitude}, long: ${user.longitude}`);
            logger.debug(`New location - lat: ${location.latitude}, long: ${location.longitude}`);

            user.latitude = location.latitude;
            user.longitude = location.longitude;
            await user.save();

            logger.info(`Location updated successfully for user ${id}`);
            logger.debug(`Updated user data: ${JSON.stringify(user)}`);

            return reply.send({
                success: true,
                user,
                message: 'Location updated successfully',
            });
        } catch (error) {
            logger.error(`Error updating location for user ${id}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            return reply.status(500).send({error: 'Failed to update location'});
        }
    },
    generateOTP,
};
