import {
    DriverProfile,
    PassengerProfile,
    User,
} from "#config/index.js";
import RedisCache from "#utils/redisCache.js";
import fs from "fs";
import path from "path";
import pump from "pump";
import createLogger from "#utils/logger.js";
import { randomInt } from 'crypto';

const logger = createLogger("user-service");



function generateOTP() {
    return randomInt(100000, 1000000).toString(); // returns a 6-digit number
}

export const userService = {
    findUserByPhoneOrEmail: async ({phoneNumber, email}) => {
        logger.info("Finding user by phone or email", { phoneNumber, email });
        return email
            ? await User.findOne({where: {email}})
            : await User.findOne({where: {phoneNumber}});
    },

    generateAndStoreOtp: async (identifier) => {
        const otp = generateOTP();
        await RedisCache.set(`otp:${identifier}`, otp, 300);
        logger.info("Generated and stored OTP", { identifier });
        return otp;
    },

    verifyOtp: async (identifier, otp) => {
        const storedOtp = await RedisCache.get(`otp:${identifier}`);
        if (!storedOtp || storedOtp !== otp) {
            logger.warn("Invalid OTP verification attempt", { identifier });
            throw new Error("Invalid OTP");
        }
        await RedisCache.del(`otp:${identifier}`);
        logger.info("OTP verified and deleted", { identifier });
    },

    createUserWithProfile: async (data) => {
        const {profileType, ...userInfo} = data;
        const user = await User.create(userInfo);
        logger.info("Created user", { id: user.id, profileType });
        if (profileType === "driver") {
            await DriverProfile.create({userId: user.id, statusProfile: "Active"});
            logger.info("Created driver profile", { userId: user.id });
        } else {
            await PassengerProfile.create({userId: user.id});
            logger.info("Created passenger profile", { userId: user.id });
        }
        return user;
    },

    saveProfileImage: (file) => {
        const uploadDir = path.join(process.cwd(), "uploads");
        fs.mkdirSync(uploadDir, {recursive: true});
        const filePath = path.join(uploadDir, file.filename);
        fs.writeFileSync(filePath, file.buffer);
        logger.info("Saved profile image", { filePath });
        return `/uploads/${file.filename}`;
    },

    savePdfFromParts: async (parts, userId) => {
        for await (const part of parts) {
            if (part.file && part.fieldname === "pdf") {
                const uploadDir = path.join(process.cwd(), "uploads");
                fs.mkdirSync(uploadDir, {recursive: true});
                const filename = `driver_application_${userId}_${Date.now()}.pdf`;
                const filePath = path.join(uploadDir, filename);
                const writeStream = fs.createWriteStream(filePath);
                await new Promise((resolve, reject) => {
                    pump(part.file, writeStream, (err) =>  err);
                });
                logger.info("Saved driver application PDF", { userId, filePath });
                return `/uploads/${filename}`;
            }
        }
        logger.warn("PDF file is required for driver application", { userId });
        throw new Error("PDF file is required");
    },

    findPassengerProfile: async (userId) => {
        logger.info("Finding passenger profile", { userId });
        return await PassengerProfile.findOne({where: {userId}});
    }
};
