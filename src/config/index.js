const RideInstance = require('./../modules/ride-module/models/rideInstance');
const RideModel = require('./../modules/ride-module/models/rideModel');
const Booking = require('./../modules/booking-module/models/booking');
// const RideRating = require('./../modules/rideRating-module/models/rideRating');
const User = require('./../modules/user-module/models/user');
const Payment = require('./../modules/payment-module/models/payment');

const AuditLog = require('./../modules/audit-module/models/auditLog');
const AuditAction = require('./../modules/audit-module/models/actionType');
const passengerProfile = require('./../modules/user-module/models/passengerProfile');
const driverProfile = require('./../modules/user-module/models/driverProfile');
const DriverApplication = require('./../modules/user-module/models/driverApplication');

RideModel.hasMany(RideInstance, {foreignKey: 'rideId'});
RideInstance.belongsTo(RideModel, {foreignKey: 'rideId'});
RideInstance.hasMany(Booking, {foreignKey: 'rideInstanceId'});

Booking.belongsTo(passengerProfile, {foreignKey: 'userId'});
Booking.belongsTo(RideInstance, {foreignKey: 'rideInstanceId'});
passengerProfile.hasMany(Booking, { foreignKey: 'userId' });

RideModel.belongsTo(driverProfile, { foreignKey: 'driverId' });
driverProfile.hasMany(RideModel, { foreignKey: 'driverId' });

passengerProfile.hasMany(DriverApplication, { foreignKey: 'userId' });
DriverApplication.belongsTo(passengerProfile, { foreignKey: 'userId', as: 'passengerProfile' });

Payment.belongsTo(Booking,{ foreignKey: 'bookingId' });
Booking.hasOne(Payment, { foreignKey: 'bookingId' });

User.hasMany(AuditLog, { foreignKey: 'userId' });

module.exports = {RideInstance, RideModel,User, Booking, Payment,AuditLog,AuditAction,DriverApplication,passengerProfile,driverProfile};


