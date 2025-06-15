const RideInstance = require('./../modules/ride-module/models/rideInstance');
const RideModel = require('./../modules/ride-module/models/rideModel');
const Booking = require('./../modules/booking-module/models/booking');
const RideRating = require('./../modules/rideRating-module/models/rideRating');
const User = require('./../modules/user-module/models/user');
const Payment = require('./../modules/payment-module/models/payment');

RideModel.hasMany(RideInstance, {foreignKey: 'rideId'});
RideInstance.belongsTo(RideModel, {foreignKey: 'rideId'});
RideInstance.hasMany(Booking, {foreignKey: 'rideInstanceId'});
RideInstance.hasMany(RideRating, {foreignKey: 'rideInstanceId'});
RideRating.belongsTo(RideInstance, {foreignKey: 'rideInstanceId'});

Booking.belongsTo(User, { foreignKey: 'userId' });
Booking.belongsTo(RideInstance, {foreignKey: 'rideInstanceId'});
User.hasMany(Booking, { foreignKey: 'userId' });

RideRating.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(RideRating, { foreignKey: 'userId' });

RideModel.belongsTo(User, { as: 'driver', foreignKey: 'driverId' });
User.hasMany(RideModel, { as: 'drives', foreignKey: 'driverId' });

Payment.belongsTo(Booking,{ foreignKey: 'bookingId' });
Booking.hasOne(Payment, { foreignKey: 'bookingId' });

module.exports = {RideInstance, RideModel, RideRating, User, Booking, Payment};


