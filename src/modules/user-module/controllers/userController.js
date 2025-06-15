const { User, DriverApplication } = require("./../../../config/index");
const createLogger = require("./../../../utils/logger");
const logger = createLogger("user-controller");
const pump = require("pump");

// Store OTPs in-memory for demo; use Redis or DB in production
const otpStore = {};

module.exports = (fastify) => ({
  getAllUsers: async (req, reply) => {
    logger.info("getAllUsers endpoint called");
    try {
      logger.debug("Attempting to retrieve all users from database");
      const users = await User.findAll();
      logger.info(`Retrieved ${users.length} users successfully`);
      logger.debug(`User data: ${JSON.stringify(users)}`);
      return reply.send({ users });
    } catch (error) {
      logger.error(`Error retrieving users: ${error.message}`);
      logger.debug(`Error stack: ${error.stack}`);
      return reply.status(500).send({ error: "Failed to retrieve users" });
    }
  },
  getUserById: async (req, reply) => {
    const { id } = req.params;
    logger.info(`getUserById called for user ID: ${id}`);
    try {
      const user = await User.findByPk(id);
      if (!user) {
        logger.warn(`No user found with ID: ${id}`);
        return reply.status(404).send({ error: "User not found" });
      }
      logger.info(`User ${id} found successfully`);
      return reply.send({ user });
    } catch (error) {
      logger.error(`Error retrieving user ${id}: ${error.message}`);
      return reply.status(500).send({ error: "Failed to retrieve user" });
    }
  },

  requestLoginOtp: async (req, reply) => {
    const { phoneNumber } = req.body;
    logger.info(`Requesting login OTP for phone number: ${phoneNumber}`);
    try {
      const user = await User.findOne({ where: { phoneNumber } });
      if (!user) {
        logger.warn(`No user found with phone number ${phoneNumber}`);
        return reply.status(404).send({ error: "User not found" });
      }
      const otp = generateOTP();
      otpStore[phoneNumber] = otp;
      logger.info(`OTP generated for login: ${otp}`);
      // TODO: Send OTP via SMS in production
      return reply.send({ success: true, otp });
    } catch (error) {
      logger.error(`Error requesting login OTP: ${error.message}`);
      return reply
        .status(500)
        .send({ error: "Failed to request OTP", message: error.message });
    }
  },

  login: async (req, reply) => {
    const { phoneNumber, otp } = req.body;
    logger.info(`Login attempt with phone number: ${phoneNumber}`);
    try {
      const user = await User.findOne({ where: { phoneNumber } });
      if (!user) {
        logger.warn(`No user found with phone number ${phoneNumber}`);
        return reply.status(404).send({ error: "User not found" });
      }
      if (!otp || otpStore[phoneNumber] !== otp) {
        logger.warn(`Invalid OTP for phone number ${phoneNumber}`);
        return reply.status(401).send({ error: "Invalid OTP" });
      }
      delete otpStore[phoneNumber];
      const token = fastify.signToken({
        id: user.id,
        phoneNumber: user.phoneNumber,
        isDriver: user.isDriver,
      });
      logger.info(`Login successful for user ${user.id}`);
      return reply.send({ user, token });
    } catch (error) {
      logger.error(
        `Login error for phone number ${phoneNumber}: ${error.message}`
      );
      return reply
        .status(500)
        .send({ error: "Login failed", message: error.message });
    }
  },

  requestRegisterOtp: async (req, reply) => {
    const { phoneNumber } = req.body;
    logger.info(`Requesting register OTP for phone number: ${phoneNumber}`);
    try {
      const existingUser = await User.findOne({ where: { phoneNumber } });
      if (existingUser) {
        logger.warn(`User already exists with phone number ${phoneNumber}`);
        return reply.status(400).send({ error: "User already exists" });
      }
      const otp = generateOTP();
      otpStore[phoneNumber] = otp;
      logger.info(`OTP generated for registration: ${otp}`);
      // TODO: Send OTP via SMS in production
      return reply.send({ success: true, otp });
    } catch (error) {
      logger.error(`Error requesting register OTP: ${error.message}`);
      return reply
        .status(500)
        .send({ error: "Failed to request OTP", message: error.message });
    }
  },

  createUser: async (req, reply) => {
    const { phoneNumber, fullName, dateOfBirth, sexe, email, otp } = req.body;
    logger.info(`Creating new user with phone number: ${phoneNumber}`);
    try {
      const existingUser = await User.findOne({ where: { phoneNumber } });
      if (existingUser) {
        logger.warn(`User already exists with phone number ${phoneNumber}`);
        return reply.status(400).send({ error: "User already exists" });
      }
      if (!otp || otpStore[phoneNumber] !== otp) {
        logger.warn(
          `Invalid OTP for registration for phone number ${phoneNumber}`
        );
        return reply.status(401).send({ error: "Invalid OTP" });
      }
      delete otpStore[phoneNumber];
      const user = await User.create({
        phoneNumber,
        fullName,
        dateOfBirth,
        sexe,
        email,
      });
      logger.info(`User created successfully with ID: ${user.id}`);
      const token = fastify.signToken({
        id: user.id,
        phoneNumber: user.phoneNumber,
      });
      return reply.status(201).send({ user, token });
    } catch (error) {
      logger.error(
        `Error creating user with phone ${phoneNumber}: ${error.message}`
      );
      return reply
        .status(500)
        .send({ error: "Failed to create user", message: error.message });
    }
  },
  updateUser: async (req, reply) => {
    const { id } = req.params;
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
      const user = await User.findByPk(id);
      if (!user) {
        logger.warn(`Update failed: No user found with ID ${id}`);
        return reply.status(404).send({ error: "User not found" });
      }

      for (const key in fields) {
        if (fields.hasOwnProperty(key) && key in user) {
          logger.debug(`Updating ${key} to ${fields[key]}`);
          user[key] = fields[key];
        }
      }

      if (profileImageBuffer && profileImageFilename) {
        const fs = require("fs");
        const path = require("path");
        const uploadDir = path.join(__dirname, "..", "uploads");
        const filePath = path.join(uploadDir, profileImageFilename);

        fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(filePath, profileImageBuffer);

        user.profileImage = `/uploads/${profileImageFilename}`;
      }

      await user.save();
      return reply.send({ user });
    } catch (err) {
      logger.error(`Error updating user ${id}: ${err.message}`);
      return reply.status(500).send({ error: "Server error" });
    }
  },

  deleteUser: async (req, reply) => {
    const { id } = req.params;
    logger.info(`Deleting user with ID: ${id}`);

    try {
      logger.debug(`Looking up user with ID: ${id}`);
      const user = await User.findByPk(id);

      if (!user) {
        logger.warn(`Deletion failed: No user found with ID ${id}`);
        return reply.status(404).send({ error: "User not found" });
      }

      logger.debug(`User found, proceeding with deletion of user ${id}`);
      await user.destroy();

      logger.info(`User ${id} deleted successfully`);
      return reply.status(204).send();
    } catch (error) {
      logger.error(`Error deleting user ${id}: ${error.message}`);
      logger.debug(`Error stack: ${error.stack}`);
      return reply.status(500).send({ error: "Failed to delete user" });
    }
  },

  updateFcmToken: async (req, reply) => {
    const id = req.user.id;
    const { fcmToken } = req.body;
    logger.info(`Updating FCM token for user ${id}`);
    logger.debug(`New FCM token: ${fcmToken}`);

    try {
      logger.debug(`Looking up user with ID: ${id}`);
      const user = await User.findByPk(id);

      if (!user) {
        logger.warn(`Update failed: No user found with ID ${id}`);
        return reply.status(404).send({ error: "User not found" });
      }

      logger.debug(`User found, updating FCM token for user ${id}`);
      user.fcmToken = fcmToken;
      await user.save();

      logger.info(`FCM token updated successfully for user ${id}`);
      logger.debug(`Updated user data: ${JSON.stringify(user)}`);
      return reply.send({ user });
    } catch (error) {
      logger.error(`Error updating FCM token for user ${id}: ${error.message}`);
      logger.debug(`Error stack: ${error.stack}`);
      return reply.status(500).send({ error: "Failed to update FCM token" });
    }
  },

  updateLocation: async (req, reply) => {
    const id = req.user.id;
    const { location } = req.body;
    logger.info(`Updating location for user ${id}`);
    logger.debug(`New location data: ${JSON.stringify(location)}`);

    try {
      logger.debug(`Looking up user with ID: ${id}`);
      const user = await User.findByPk(id);

      if (!user) {
        logger.warn(`Update failed: No user found with ID ${id}`);
        return reply.status(404).send({ error: "User not found" });
      }

      logger.debug(`User found, updating location for user ${id}`);
      logger.debug(
        `Previous location - lat: ${user.latitude}, long: ${user.longitude}`
      );
      logger.debug(
        `New location - lat: ${location.latitude}, long: ${location.longitude}`
      );

      user.latitude = location.latitude;
      user.longitude = location.longitude;
      await user.save();

      logger.info(`Location updated successfully for user ${id}`);
      logger.debug(`Updated user data: ${JSON.stringify(user)}`);

      return reply.send({
        success: true,
        user,
        message: "Location updated successfully",
      });
    } catch (error) {
      logger.error(`Error updating location for user ${id}: ${error.message}`);
      logger.debug(`Error stack: ${error.stack}`);
      return reply.status(500).send({ error: "Failed to update location" });
    }
  },

  submitDriverApplication: async (req, reply) => {
    const userId = req.user.id;
    try {
      const existing = await DriverApplication.findOne({
        where: { userId, status: "pending" },
      });
      if (existing) {
        return reply
          .status(400)
          .send({ error: "You already have a pending application." });
      }

      const parts = req.parts();
      let pdfPath = null;
      for await (const part of parts) {
        if (part.file && part.fieldname === "pdf") {
          const fs = require("fs");
          const path = require("path");
          const uploadDir = path.join(__dirname, "..", "uploads");
          fs.mkdirSync(uploadDir, { recursive: true });
          const filename = `driver_application_${userId}_${Date.now()}.pdf`;
          const filePath = path.join(uploadDir, filename);
          const writeStream = fs.createWriteStream(filePath);
          await new Promise((resolve, reject) => {
            pump(part.file, writeStream, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          pdfPath = `/uploads/${filename}`;
        }
      }
      if (!pdfPath) {
        return reply.status(400).send({ error: "PDF file is required." });
      }
      const application = await DriverApplication.create({
        userId,
        documents: pdfPath,
      });
      return reply.status(201).send({ application });
    } catch (error) {
      logger.error(`Error in submitDriverApplication: ${error.message}`);
      logger.debug(error.stack);
      return reply.status(500).send({
        error: "Failed to submit application",
        message: error.message,
      });
    }
  },

    getDriverApplicationStatus: async (req, reply) => {
        const userId = req.user.id;
        try {
            const application = await DriverApplication.findOne({
            where: { userId },
            });
            if (!application) {
                return reply.send({
                  status: "none",
                  comments: null,
                });
            }
            if (application.status) { 
                return reply.send({
                    status: application.status,
                    comments: application.comments || null,
                });
            }
        } catch (error) {
            logger.error(`Error fetching driver application status: ${error.message}`);
            return reply.status(500).send({
            error: "Failed to fetch application status",
            message: error.message,
            });
        }
     }
});

function generateOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  logger.debug(`Generated OTP: ${otp}`); 
  return otp;
}
