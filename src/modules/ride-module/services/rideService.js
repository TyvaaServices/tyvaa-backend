import { Op } from "sequelize";
import {
    DriverProfile,
    RideInstance,
    RideModel,
} from "./../../../config/index.js";
import createLogger from "./../../../utils/logger.js";
import RedisCacheService from "../../../utils/redisCache.js";

const logger = createLogger("ride-service");

const rideService = {
    getAllRides: async () => RideModel.findAll(),
    getRideById: async (id) => RideModel.findByPk(id),
    createRide: async (data) => {
        const ride = await RideModel.create(data);
        logger.info("Ride created", ride.id);
        if (!ride.isRecurring && ride.startDate && ride.time) {
            const rideDateTime = new Date(`${ride.startDate}T${ride.time}`);
            await RideInstance.create({
                rideId: ride.id,
                rideDate: rideDateTime,
                seatsAvailable: ride.seatsAvailable,
                status: "scheduled",
            });
            logger.info(
                "RideInstance automatically created for non-recurrent ride",
                ride.id
            );
        }
        return ride;
    },
    updateRide: async (id, data) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.update(data);
        logger.info("Ride updated", ride.id);
        return ride;
    },
    deleteRide: async (id) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.destroy();
        logger.info("Ride deleted", ride.id);
        return true;
    },
    getAllRideInstances: async () => RideInstance.findAll(),
    getRideInstanceById: async (id) => RideInstance.findByPk(id),
    createRideInstance: async (data) => {
        const instance = await RideInstance.create(data);
        logger.info("RideInstance created", instance.id);
        return instance;
    },
    updateRideInstance: async (id, data) => {
        const instance = await RideInstance.findByPk(id);
        if (!instance) return null;
        await instance.update(data);
        logger.info("RideInstance updated", instance.id);
        return instance;
    },
    deleteRideInstance: async (id) => {
        const instance = await RideInstance.findByPk(id);
        if (!instance) return null;
        await instance.destroy();
        logger.info("RideInstance deleted", instance.id);
        return true;
    },
    acceptRide: async (id) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.update({ status: "active" });
        logger.info("Ride accepted", ride.id);
        return true;
    },
    rejectRide: async (id) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.update({ status: "cancelled" });
        logger.info("Ride rejected", ride.id);
        return true;
    },
    completeRide: async (id) => {
        const ride = await RideModel.findByPk(id);
        if (!ride) return null;
        await ride.update({ status: "completed" });
        logger.info("Ride completed", ride.id);
        return true;
    },
    getAvailableRideInstances: async () => {
        const now = new Date();
        return await RideInstance.findAll({
            where: {
                status: "active",
                departureTime: { [Op.gt]: now },
                availableSeats: { [Op.gt]: 0 },
            },
            include: [
                {
                    model: RideModel,
                    attributes: ["departure", "destination", "price"],
                },
                {
                    association: "driverProfile", // ou ton alias exact si défini
                    attributes: ["id", "fullName", "phoneNumber"],
                },
            ],
        });
    },
    searchRideInstanceByDepartureAndDestination: async (
        departure,
        destination,
        date
    ) => {
        const cacheKey = `ride_search:${departure}:${destination}:${date || "any"}`;
        const cache = RedisCacheService;
        let cachedResult = null;
        try {
            cachedResult = await cache.get(cacheKey);
        } catch (err) {
            logger.warn("Redis cache get failed", err);
        }
        if (cachedResult) {
            logger.info(
                "Cache hit for searchRideInstanceByDepartureAndDestination"
            );
            return cachedResult;
        }
        // Use 'scheduled' instead of 'active' for status
        // Filter by departure/destination in RideModel, not RideInstance
        const whereClause = {
            status: "scheduled",
        };
        if (date) {
            whereClause.rideDate = {
                [Op.gte]: new Date(date),
                [Op.lt]: new Date(
                    new Date(date).setDate(new Date(date).getDate() + 1)
                ),
            };
        }
        const result = await RideInstance.findAll({
            where: whereClause,
            include: [
                {
                    model: RideModel,
                    where: {
                        departure,
                        destination,
                    },
                    include: [
                        {
                            model: DriverProfile,
                        },
                    ],
                },
            ],
        });
        try {
            await cache.set(cacheKey, result, 600); // 600 seconds = 10 minutes
        } catch (err) {
            logger.warn("Redis cache set failed", err);
        }
        return result;
    },
};

export default rideService;
