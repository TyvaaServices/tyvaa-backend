const axios = require('axios');
const User = require('./../models/user');
const logger = require('./../utils/logger');


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
                isDriver: user.isDriver,
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
        const {phoneNumber, fullName, dateOfBirth, sexe, email} = req.body;
        logger.info(`Creating new user with phone number: ${phoneNumber}`);

        try {
            logger.debug(`Checking if user already exists with phone number: ${phoneNumber}`);
            const existingUser = await User.findOne({where: {phoneNumber}});

            if (existingUser) {
                logger.warn(`User creation failed: User already exists with phone number ${phoneNumber}`);
                return reply.status(400).send({error: 'User already exists'});
            }

            logger.debug(`Creating new user with data: ${JSON.stringify(req.body)}`);
            const user = await User.create({phoneNumber, fullName, dateOfBirth, sexe, email});

            logger.info(`User created successfully with ID: ${user.id}`);
            logger.debug(`New user data: ${JSON.stringify(user)}`);

            let token;
            let otp;
            try {
                const response = await axios.post(`${process.env.AUTH_SERVICE_URL}/api/v1/token`, {
                    id: user.id,
                    phoneNumber: user.phoneNumber,
                });
                token = response.data.token;
                otp = response.data.otp;
            } catch (authError) {
                logger.error(`Auth service error for user ${user.id}: ${authError.message}`);
                logger.debug(`Auth service error stack: ${authError.stack}`);
                logger.debug(`Auth service error details: ${JSON.stringify(authError.response ? authError.response.data : authError)}`);
                return reply.status(500).send({
                    error: 'Failed to create user (auth service)',
                    message: authError.message,
                    details: authError.response ? authError.response.data : authError
                });
            }

            return reply.status(201).send({user, otp, token});
        } catch (error) {
            logger.error(`Error creating user with phone ${phoneNumber}: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            logger.debug(`Full error object: ${JSON.stringify(error)}`);
            return reply.status(500).send({
                error: 'Failed to create user',
                message: error.message,
                details: error
            });
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
                if (part.fieldname === 'profile_image') {
                    logger.debug(`Received profile image file: ${part.filename}`);
                    profileImageFilename = part.filename;
                    profileImageBuffer = await part.toBuffer();
                }
            } else {
                fields[part.fieldname] = part.value;
            }
        }

        try {
            const user = await User.findByPk(id);
            if (!user) {
                logger.warn(`Update failed: No user found with ID ${id}`);
                return reply.status(404).send({error: 'User not found'});
            }

            for (const key in fields) {
                if (fields.hasOwnProperty(key) && key in user) {
                    logger.debug(`Updating ${key} to ${fields[key]}`);
                    user[key] = fields[key];
                }
            }

            if (profileImageBuffer && profileImageFilename) {
                const fs = require('fs');
                const path = require('path');
                const uploadDir = path.join(__dirname, '..', 'uploads');
                const filePath = path.join(uploadDir, profileImageFilename);

                fs.mkdirSync(uploadDir, {recursive: true});
                fs.writeFileSync(filePath, profileImageBuffer);

                user.profileImage = `/uploads/${profileImageFilename}`;
            }

            await user.save();
            return reply.send({user});
        } catch (err) {
            logger.error(`Error updating user ${id}: ${err.message}`);
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
};
