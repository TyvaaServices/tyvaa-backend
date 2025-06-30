import Fastify from "fastify";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import compress from "@fastify/compress";
import swaggerConfig from "./config/swagger.js";
import { RedisCache } from "./utils/redisCache.js";

dotenv.config();

const fastifyJwtPlugin = await import("./utils/jwt.js");
const chatbotModule = (await import("./modules/chatbot-module/server.js"))
    .default;
const notificationModule = (
    await import("./modules/notification-module/server.js")
).default;
const rideModule = (await import("./modules/ride-module/server.js")).default;
const userModule = (await import("./modules/user-module/server.js")).default;
const bookingModule = (await import("./modules/booking-module/server.js"))
    .default;
const paymentModule = (await import("./modules/payment-module/server.js"))
    .default;
const rbacPlugin = (await import("./utils/rbacPlugin.js")).default;
const errorHandlerPlugin = (await import("./utils/errorHandler.js")).default;
const swagger = (await import("@fastify/swagger")).default;
const swaggerUi = (await import("@fastify/swagger-ui")).default;

export async function buildApp() {
    const fastify = Fastify({ logger: true });
    fastify.get("/health", async (_request, _reply) => {
        return { status: "ok" };
    });
    fastify.register(cors, {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        exposedHeaders: ["Content-Length", "X-Requested-With"],
        credentials: true,
        maxAge: 86400,
    });

    fastify.register(fastifyJwtPlugin);
    fastify.register(rbacPlugin);
    fastify.register(chatbotModule);
    fastify.register(notificationModule);
    fastify.register(rideModule);
    fastify.register(userModule);
    fastify.register(bookingModule);
    fastify.register(paymentModule);
    fastify.register(swagger, swaggerConfig.options);
    fastify.register(swaggerUi, swaggerConfig.uiOptions);
    fastify.register(compress, { global: true });
    fastify.register(rateLimit, {
        max: 100,
        timeWindow: "1 minute",
        keyGenerator: (req, _res) => req.headers["x-forwarded-for"] || req.ip,
    });
    fastify.register(errorHandlerPlugin);
    return fastify;
}

export async function startServer() {
    // Test Redis connection on boot
    if (process.env.NODE_ENV !== "test") {
        await RedisCache.testConnection();
    }
    const fastify = await buildApp();
    const sequelize = (await import("./config/db.js")).default;
    return new Promise((resolve, reject) => {
        fastify.listen(
            { port: process.env.PORT || 3000, host: "0.0.0.0" },
            async (err, address) => {
                if (err) {
                    fastify.log.error(err);
                    reject(err);
                }
                if (process.env.NODE_ENV !== "test") {
                    try {
                        await sequelize.sync({ force: true, logging: false });
                        fastify.log.info("Database synchronized");
                    } catch (syncError) {
                        fastify.log.error("Database sync failed:", syncError);
                        return reject(
                            syncError instanceof Error
                                ? syncError
                                : new Error(syncError)
                        );
                    }
                }
                fastify.log.info(`Server listening at ${address}`);
                resolve(fastify);
                if (process.env.NODE_ENV !== "test") {
                    await fastify.ready();
                    console.log(fastify.printRoutes());
                }
            }
        );
        const shutdown = async () => {
            try {
                await fastify.close();
                setTimeout(() => process.exit(0), 200);
            } catch (err) {
                fastify.log.error("Error during shutdown", err);
                process.exit(1);
            }
        };
        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
    });
}

if (process.env.NODE_ENV !== "test") {
    startServer().catch((err) => {
        console.log("Failed to start server:", err);
        process.exit(1);
    });
}
