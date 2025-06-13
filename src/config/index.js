const RideInstance = require('./../modules/ride-module/models/rideInstance');
const RideModel = require('./../modules/ride-module/models/rideModel');
const Booking = require('./../modules/ride-module/models/booking');
const RideRating = require('./../modules/ride-module/models/rideRating');
const User = require('./../modules/user-module/models/user');

Booking.belongsTo(RideInstance, {foreignKey: 'rideInstanceId'});
RideModel.hasMany(RideInstance, {foreignKey: 'rideId'});
RideInstance.belongsTo(RideModel, {foreignKey: 'rideId'});
RideInstance.hasMany(Booking, {foreignKey: 'rideInstanceId'});
RideInstance.hasMany(RideRating, {foreignKey: 'rideInstanceId'});
RideRating.belongsTo(RideInstance, {foreignKey: 'rideInstanceId'});

Booking.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Booking, { foreignKey: 'userId' });

RideRating.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(RideRating, { foreignKey: 'userId' });

RideModel.belongsTo(User, { as: 'driver', foreignKey: 'driverId' });
User.hasMany(RideModel, { as: 'drives', foreignKey: 'driverId' });

module.exports = {Booking, RideInstance, RideModel, RideRating, User};
