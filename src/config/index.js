import RideInstance from './../modules/ride-module/models/rideInstance.js';
import RideModel from './../modules/ride-module/models/rideModel.js';
import Booking from './../modules/booking-module/models/booking.js';
// import RideRating from './../modules/rideRating-module/models/rideRating.js';
import User from './../modules/user-module/models/user.js';
import Payment from './../modules/payment-module/models/payment.js';
import AuditLog from './../modules/audit-module/models/auditLog.js';
import AuditAction from './../modules/audit-module/models/actionType.js';
import PassengerProfile from './../modules/user-module/models/passengerProfile.js';
import DriverProfile from './../modules/user-module/models/driverProfile.js';
import DriverApplication from './../modules/user-module/models/driverApplication.js';

RideModel.hasMany(RideInstance, {foreignKey: 'rideId'});
RideInstance.belongsTo(RideModel, {foreignKey: 'rideId'});
RideInstance.hasMany(Booking, {foreignKey: 'rideInstanceId'});

Booking.belongsTo(PassengerProfile, {foreignKey: 'userId'});
Booking.belongsTo(RideInstance, {foreignKey: 'rideInstanceId'});
PassengerProfile.hasMany(Booking, {foreignKey: 'userId'});

RideModel.belongsTo(DriverProfile, {foreignKey: 'driverId'});
DriverProfile.hasMany(RideModel, {foreignKey: 'driverId'});

// Change association to use passengerProfileId for clarity
PassengerProfile.hasMany(DriverApplication, {foreignKey: 'passengerProfileId'});
DriverApplication.belongsTo(PassengerProfile, {foreignKey: 'passengerProfileId', as: 'passengerProfile'});

Payment.belongsTo(Booking, {foreignKey: 'bookingId'});
Booking.hasOne(Payment, {foreignKey: 'bookingId'});

User.hasMany(AuditLog, {foreignKey: 'userId'});
AuditLog.belongsTo(User, {foreignKey: 'userId', as: 'user'});

User.hasOne(PassengerProfile, {foreignKey: 'userId', as: 'passengerProfile'});
User.hasOne(DriverProfile, {foreignKey: 'userId', as: 'driverProfile'});
PassengerProfile.belongsTo(User, {foreignKey: 'userId', as: 'user'});
export {
    User,
    RideModel,
    Booking,
    RideInstance,
    // RideRating,
    DriverApplication,
    Payment,
    AuditAction,
    AuditLog,
    PassengerProfile,
    DriverProfile
};
