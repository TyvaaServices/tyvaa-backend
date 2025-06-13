const {Booking} = require('./../../../config');
const createLogger = require('./../../../utils/logger');
const logger = createLogger('booking-service');

const bookingService = {
    getAllBookings: async () => Booking.findAll(),
    getBookingById: async (id) => Booking.findByPk(id),
    updateBooking: async (id, data) => {
        const booking = await Booking.findByPk(id);
        if (!booking) return null;
        await booking.update(data);
        logger.info('Booking updated', booking.id);
        return booking;
    },
    deleteBooking: async (id) => {
        const booking = await Booking.findByPk(id);
        if (!booking) return null;
        await booking.destroy();
        logger.info('Booking deleted', booking.id);
        return true;
    },
    bookRide: async ({ user, rideInstance, seatsToBook }) => {
        if (!user) throw new Error('User instance required');
        if (!rideInstance) throw new Error('RideInstance required');
        const availableSeats = rideInstance.seatsAvailable - rideInstance.seatsBooked;
        if (seatsToBook > availableSeats) throw new Error('Not enough seats available');
        const existing = await Booking.findOne({
            where: { rideInstanceId: rideInstance.id, userId: user.id }
        });
        if (existing) throw new Error('Already booked');
        const booking = await Booking.create({ seatsBooked: seatsToBook, status: 'booked' });
        await booking.setUser(user);
        await booking.setRideInstance(rideInstance);
        await rideInstance.increment('seatsBooked', { by: seatsToBook });
        logger.info('Ride booked', booking.id);
        return booking;
    },
    cancelBooking: async (bookingId) => {
        const booking = await Booking.findByPk(bookingId, { include: [RideInstance] });
        if (!booking || booking.status === 'cancelled') return null;
        const rideInstance = booking.RideInstance;
        await booking.update({status: 'cancelled'});
        if (rideInstance) {
            await rideInstance.decrement('seatsBooked', {by: booking.seatsBooked});
        }
        logger.info('Booking cancelled', booking.id);
        return true;
    },
};

module.exports = bookingService;

