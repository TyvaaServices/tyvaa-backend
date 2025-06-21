import {userService} from "../services/userService.js";

export const userFacade = {
    async findAllUsers() {
        return userService.findAllUsers();
    },
    async findUserById(id) {
        return userService.findUserById(id);
    },
    async findUserByPhone(phoneNumber) {
        return userService.findUserByPhone(phoneNumber);
    },
    async findUserByEmail(email) {
        return userService.findUserByEmail(email);
    },
    async createUser(data) {
        return userService.createUser(data);
    },
    async saveUser(user) {
        return userService.saveUser(user);
    },
    async setOtp(key, otp, ttl = 300) {
        return userService.setOtp(key, otp, ttl);
    },
    async getOtp(key) {
        return userService.getOtp(key);
    },
    async delOtp(key) {
        return userService.delOtp(key);
    },
    async findPassengerProfileByUserId(userId) {
        return userService.findPassengerProfileByUserId(userId);
    },
    async createPassengerProfile(data) {
        return userService.createPassengerProfile(data);
    },
    async findDriverProfileByUserId(userId) {
        return userService.findDriverProfileByUserId(userId);
    },
    async createDriverProfile(data) {
        return userService.createDriverProfile(data);
    },
    async findDriverApplicationById(id) {
        return userService.findDriverApplicationById(id);
    },
    async findAllDriverApplications() {
        return userService.findAllDriverApplications();
    },
    async findDriverApplicationByPassengerProfileId(passengerProfileId) {
        return userService.findDriverApplicationByPassengerProfileId(passengerProfileId);
    },
    async createDriverApplication(data) {
        return userService.createDriverApplication(data);
    },
    async saveDriverApplication(application) {
        return userService.saveDriverApplication(application);
    },
    async findDriverApplicationByPassenger(passengerProfileId) {
        return userService.findDriverApplicationByPassenger(passengerProfileId);
    },
    async updateFcmTokenFacade(userId, fcmToken) {
        return userService.updateFcmToken(userId, fcmToken);
    },
    async updateLocationFacade(userId, location) {
        return userService.updateLocation(userId, location);
    },
    async deleteUserFacade(userId) {
        return userService.deleteUserById(userId);
    },
    async blockUserFacade(userId) {
        return userService.blockUserById(userId);
    },
    async updateUserProfileImage(userId, fields, profileImageBuffer, profileImageFilename, uploadDir) {
        return userService.updateUserProfileImage(userId, fields, profileImageBuffer, profileImageFilename, uploadDir);
    },
    async getUserByIdWithProfiles(id) {
        return userService.getUserByIdWithProfiles(id);
    },
    async updateUserFields(userId, fields) {
        return userService.updateUserFields(userId, fields);
    },
    async getPassengerProfileByUserId(userId) {
        return userService.getPassengerProfileByUserId(userId);
    },
    async getDriverProfileByUserId(userId) {
        return userService.getDriverProfileByUserId(userId);
    },
    async getDriverApplicationById(id) {
        return userService.getDriverApplicationById(id);
    },
    async getDriverApplicationsByPassengerProfileId(passengerProfileId) {
        return userService.getDriverApplicationsByPassengerProfileId(passengerProfileId);
    },
    async getUserByEmailOrPhone({email, phoneNumber}) {
        return userService.getUserByEmailOrPhone({email, phoneNumber});
    },
    async requestLoginOtp({phoneNumber, email, generateOTP}) {
        let user;
        if (email) {
            user = await userService.findUserByEmail(email);
            if (!user) return {error: "User not found"};
        } else if (phoneNumber) {
            user = await userService.findUserByPhone(phoneNumber);
            if (!user) return {error: "User not found"};
        } else {
            return {error: "Phone number or email are required"};
        }
        const otp = generateOTP();
        const key = `otp:${phoneNumber || email}`;
        await userService.setOtp(key, otp, 300);
        return {success: true, otp};
    },
    async loginWithOtp({phoneNumber, email, otp}) {
        const key = `otp:${phoneNumber || email}`;
        const storedOtp = await userService.getOtp(key);
        if (!storedOtp || storedOtp !== otp) {
            return {error: "Invalid or expired OTP"};
        }
        let user;
        if (email) {
            user = await userService.findUserByEmail(email);
        } else if (phoneNumber) {
            user = await userService.findUserByPhone(phoneNumber);
        }
        if (!user) return {error: "User not found"};
        await userService.delOtp(key);
        return {success: true, user};
    },
    async requestRegisterOtp({phoneNumber, email, generateOTP}) {
        let user;
        if (email) {
            user = await userService.findUserByEmail(email);
            if (user) return {error: "User already exists"};
        } else if (phoneNumber) {
            user = await userService.findUserByPhone(phoneNumber);
            if (user) return {error: "User already exists"};
        } else {
            return {error: "Phone number or email are required"};
        }
        const otp = generateOTP();
        const key = `otp:${phoneNumber || email}`;
        await userService.setOtp(key, otp, 300);
        return {success: true, otp};
    },
    async registerWithOtp({phoneNumber, email, otp, userData}) {
        const key = `otp:${phoneNumber || email}`;
        const storedOtp = await userService.getOtp(key);
        if (!storedOtp || storedOtp !== otp) {
            return {error: "Invalid or expired OTP"};
        }
        let user;
        if (email) {
            user = await userService.findUserByEmail(email);
            if (user) return {error: "User already exists"};
        } else if (phoneNumber) {
            user = await userService.findUserByPhone(phoneNumber);
            if (user) return {error: "User already exists"};
        }
        user = await userService.createUser(userData);
        await userService.delOtp(key);
        return {success: true, user};
    },
    async submitDriverApplication({userId, parts, uploadDir, pump, fs, path}) {
        const passenger = await userService.findPassengerProfileByUserId(userId);
        if (!passenger) {
            return {error: "Passenger profile not found."};
        }
        const existing = await userService.findDriverApplicationByPassengerProfileId(passenger.id);
        if (existing) {
            return {error: "You already have a pending application."};
        }
        let pdfPath = null;
        for await (const part of parts) {
            if (part.file && part.fieldname === "pdf") {
                fs.mkdirSync(uploadDir, {recursive: true});
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
            return {error: "PDF file is required."};
        }
        const application = await userService.createDriverApplication({
            passengerProfileId: passenger.id,
            documents: pdfPath,
        });
        return {success: true, application};
    },
    async getDriverApplicationStatus(userId) {
        const passenger = await userService.findPassengerProfileByUserId(userId);
        if (!passenger) {
            return {status: "none", comments: null};
        }
        const application = await userService.findDriverApplicationByPassenger(passenger.id);
        if (!application) {
            return {status: "none", comments: null};
        }
        return {status: application.status, comments: application.comments || null};
    },
};
