const { User, DriverApplication, Admin } = require("../../../config/index");
const createLogger = require("../../../utils/logger");
const logger = createLogger("user-controller");
const pump = require("pump");

const transporter = require('./../../../utils/mailer');
const sendOtpEmail = require('./../utils/sendOtp')
const otpStore = {};

module.exports = (fastify) => ({
  requestLoginOtp: async (req, reply) => {
    const { email } = req.body;
    logger.info(`Admin OTP request for email: ${email}`);
    try {
      if (!email || !email.endsWith("@tyvaa.live")) {
        logger.warn(`Rejected OTP request for non-tyvaa.live email: ${email}`);
        return reply.status(403).send({ error: "Access denied" });
      }
      const admin = await Admin.findOne({ where: { email } });
      if (!admin) {
        logger.warn(`No admin found with email ${email}`);
        return reply.status(404).send({ error: "Admin not found" });
      }
      const otp = generateOTP();
      otpStore[email] = otp;
      logger.info(`Sending OTP ${otp} to admin email: ${email}`);
      await sendOtpEmail(email, otp, transporter);
      return reply.send({ success: true, message: "OTP sent to email." });
    } catch (error) {
      logger.error(
        `Admin OTP request error for email ${email}: ${error.message}`
      );
      return reply
        .status(500)
        .send({ error: "Failed to send OTP", message: error.message });
    }
  },

  login: async (req, reply) => {
    const { email, otp } = req.body;
    logger.info(`Admin login attempt with email: ${email}`);
    try {
      if (!email || !email.endsWith("@tyvaa.live")) {
        logger.warn(`Rejected login for non-tyvaa.live email: ${email}`);
        return reply.status(403).send({ error: "Access denied" });
      }
      const admin = await Admin.findOne({ where: { email } });
      if (!admin) {
        logger.warn(`No admin found with email ${email}`);
        return reply.status(404).send({ error: "Admin not found" });
      }
      if (!otp || otpStore[email] !== otp) {
        logger.warn(`Invalid OTP for admin ${email}`);
        return reply.status(401).send({ error: "Invalid OTP" });
      }
      delete otpStore[email];
      const token = fastify.signToken({
        adminId: admin.id,
        email: admin.email,
        role: "admin",
      });
      logger.info(`Admin login successful for ${admin.email}`);
      return reply.send({ admin: { id: admin.id, email: admin.email }, token });
    } catch (error) {
      logger.error(`Admin login error for email ${email}: ${error.message}`);
      return reply
        .status(500)
        .send({ error: "Login failed", message: error.message });
    }
  },

  getAllDriverApplications: async (req, reply) => {
    try {
      const applications = await DriverApplication.findAll({
        include: [{ model: User, as: "user" }],
      });
      return reply.send({ applications });
    } catch (error) {
      return reply
        .status(500)
        .send({
          error: "Failed to fetch applications",
          message: error.message,
        });
    }
  },

  reviewDriverApplication: async (req, reply) => {
    const { id } = req.params;
    const { status, comments } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return reply.status(400).send({ error: "Invalid status" });
    }
    try {
      const application = await DriverApplication.findByPk(id);
      if (!application) {
        return reply.status(404).send({ error: "Application not found" });
      }
      application.status = status;
      application.comments = comments;
      await application.save();
      if (status === "approved") {
        const user = await User.findByPk(application.userId);
        if (user) {
          user.isDriver = true;
          await user.save();
        }
      }
      return reply.send({ application });
    } catch (error) {
      return reply
        .status(500)
        .send({
          error: "Failed to review application",
          message: error.message,
        });
    }
  },
});



function generateOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  logger.debug(`Generated OTP: ${otp}`);
  return otp;
}
