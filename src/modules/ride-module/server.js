import fastify from "fastify";
import cron from "node-cron";
import generateRecurringRides from "./cron/generateRecurringRides.js";
import router from "./routes/rideRouter.js";
import dotenv from "dotenv";

dotenv.config();

const app = fastify({ logger: true });
app.register(router, { prefix: "/api/v1" });

export default async function (fastify, _opts) {
    fastify.register(router, { prefix: "/api/v1" });

    cron.schedule("* 9 * * *", async () => {
        fastify.log.info("Running recurring ride generation cron job...");
        try {
            await generateRecurringRides();
            fastify.log.info("Recurring ride generation completed.");
        } catch (err) {
            fastify.log.error(
                "Error in recurring ride generation cron job",
                err
            );
        }
    });
}
