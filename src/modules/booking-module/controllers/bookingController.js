import bookingFacade from "../facades/bookingFacade.js";
import createLogger from "#utils/logger.js";

const logger = createLogger("booking-controller");

const bookingController = {
    getAllBookings: async (req, reply) => {
        const bookings = await bookingFacade.getAllBookings();
        return reply.send(bookings);
    },
    getBookingById: async (req, reply) => {
        const booking = await bookingFacade.getBookingById(req.params.id);
        if (!booking)
            return reply.code(404).send({ error: "Booking not found" });
        return reply.send(booking);
    },
    updateBooking: async (req, reply) => {
        try {
            const booking = await bookingFacade.updateBooking(
                req.params.id,
                req.body
            );
            if (!booking)
                return reply.code(404).send({ error: "Booking not found" });
            return reply.send(booking);
        } catch (err) {
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
    deleteBooking: async (req, reply) => {
        const deleted = await bookingFacade.deleteBooking(req.params.id);
        if (!deleted)
            return reply
                .code(404)
                .send({ error: "Booking not found or could not be deleted" });
        return reply.code(204).send();
    },
    bookRide: async (req, reply) => {
        try {
            logger.debug("Booking request received:", {
                body: req.body,
                bodyType: typeof req.body,
                bodyKeys: req.body ? Object.keys(req.body) : "NO_BODY",
                headers: req.headers,
                contentType: req.headers["content-type"],
            });

            // Extract userId from JWT token
            let userId = null;
            try {
                logger.debug("Attempting JWT verification...");
                await req.jwtVerify();
                userId = req.user.id;
                logger.debug("User authenticated via JWT:", {
                    userId,
                    user: req.user,
                    userType: typeof req.user,
                    userKeys: Object.keys(req.user || {}),
                });
            } catch (jwtError) {
                logger.debug("JWT verification failed:", {
                    error: jwtError.message,
                    name: jwtError.name,
                    stack: jwtError.stack,
                });
                // Fallback to userId from body for compatibility
                userId = req.body?.userId;
                logger.debug("Using userId from body:", userId);
            }

            const {
                rideInstanceId,
                seatsToBook,
                seatsBooked,
                paymentMethod = "orange",
                country = "SN",
            } = req.body || {};

            // Handle both seatsToBook and seatsBooked field names for compatibility
            const seats = seatsToBook || seatsBooked;

            logger.debug("Extracted data:", {
                userId,
                rideInstanceId,
                seatsToBook,
                seatsBooked,
                seats,
                paymentMethod,
                country,
                userIdType: typeof userId,
                rideInstanceIdType: typeof rideInstanceId,
            });

            // Validate required fields
            if (!userId) {
                logger.debug("Validation failed: userId missing");
                return reply.code(400).send({ error: "userId is required" });
            }
            if (!rideInstanceId) {
                logger.debug("Validation failed: rideInstanceId missing");
                return reply
                    .code(400)
                    .send({ error: "rideInstanceId is required" });
            }
            if (!seats) {
                logger.debug("Validation failed: seats missing");
                return reply
                    .code(400)
                    .send({ error: "seatsToBook or seatsBooked is required" });
            }

            logger.debug("Calling bookingFacade.bookRide with:", {
                userId,
                rideInstanceId,
                seatsToBook: seats,
                paymentMethod,
                country,
            });

            const booking = await bookingFacade.bookRide({
                userId,
                rideInstanceId,
                seatsToBook: seats,
                paymentMethod,
                country,
            });

            logger.debug("Booking successful:", booking);
            return reply.code(201).send(booking);
        } catch (err) {
            logger.error("Booking error caught:", {
                message: err.message,
                stack: err.stack,
                name: err.name,
                statusCode: err.statusCode,
                code: err.code,
                sqlMessage: err.sqlMessage,
                sqlState: err.sqlState,
                errno: err.errno,
                sql: err.sql,
                parameters: err.parameters,
                cause: err.cause,
                originalError: err.originalError,
                parent: err.parent,
                fullError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
            });
            console.error(err);
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
    cancelBooking: async (req, reply) => {
        try {
            const booking = await bookingFacade.cancelBooking(
                req.params.bookingId
            );
            if (!booking)
                return reply
                    .code(404)
                    .send({ error: "Booking not found or already cancelled" });
            return reply.send({
                message: "Booking cancelled successfully.",
                booking,
            });
        } catch (err) {
            const statusCode = err.statusCode || 400;
            return reply.code(statusCode).send({ error: err.message });
        }
    },
};

export default bookingController;
