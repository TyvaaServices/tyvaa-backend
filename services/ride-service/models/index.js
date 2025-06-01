const RideInstance = require('./rideInstance');
const RideModel = require('./rideModel');
const Booking = require('./booking');
const RideRating = require('./rideRating');

Booking.belongsTo(RideInstance, {foreignKey: 'rideInstanceId'});
RideModel.hasMany(RideInstance, {foreignKey: 'rideId'});
RideInstance.belongsTo(RideModel, {foreignKey: 'rideId'});
RideInstance.hasMany(Booking, {foreignKey: 'rideInstanceId'});
RideInstance.hasMany(RideRating, {foreignKey: 'rideInstanceId'});
RideRating.belongsTo(RideInstance, {foreignKey: 'rideInstanceId'});

module.exports = {Booking, RideInstance, RideModel, RideRating};

