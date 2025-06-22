import {DriverApplication, DriverProfile, PassengerProfile, User} from "#config/index.js";
import RedisCache from "#utils/redisCache.js";

export const userService = {
    async findPassengerProfileByUserId(userId) {
        return PassengerProfile.findOne({where: {userId}});
    },
    async findDriverApplicationByPassengerProfileId(passengerProfileId) {
        return DriverApplication.findOne({where: {passengerProfileId, status: "pending"}});
    },
    async createDriverApplication(data) {
        return DriverApplication.create(data);
    },
    async findDriverApplicationByPassenger(passengerProfileId) {
        return DriverApplication.findOne({where: {passengerProfileId}, order: [["createdAt", "DESC"]]});
    },
    async setOtp(key, otp, ttl = 300) {
        return RedisCache.set(key, otp, ttl);
    },
    async getOtp(key) {
        return RedisCache.get(key);
    },
    async delOtp(key) {
        return RedisCache.del(key);
    },
    async findUserByEmail(email) {
        return User.findOne({where: {email}});
    },
    async findUserByPhone(phoneNumber) {
        return User.findOne({where: {phoneNumber}});
    },
    async createUser(data) {
        return User.create(data);
    },
    async saveUser(user) {
        return user.save();
    },
    async updateFcmToken(userId, fcmToken) {
        const user = await User.findByPk(userId);
        if (!user) return null;
        user.fcmToken = fcmToken;
        await user.save();
        return user;
    },
    async updateLocation(userId, location) {
        const user = await User.findByPk(userId);
        if (!user) return null;
        user.latitude = location.latitude;
        user.longitude = location.longitude;
        await user.save();
        return user;
    },
    async deleteUserById(userId) {
        const user = await User.findByPk(userId);
        if (!user) return false;
        await user.destroy();
        return true;
    },
    async blockUserById(userId) {
        const user = await User.findByPk(userId);
        if (!user) return null;
        user.isBlocked = true;
        await user.save();
        return user;
    },
    async createPassengerProfile(data) {
        return PassengerProfile.create(data);
    },
    async createDriverProfile(data) {
        return DriverProfile.create(data);
    },
    async findAllUsers() {
        return User.findAll({include: [{model: PassengerProfile, as: 'passengerProfile'}, {model: DriverProfile, as: 'driverProfile'}]});
    },
};
