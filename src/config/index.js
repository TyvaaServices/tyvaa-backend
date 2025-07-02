import RideInstance from "./../modules/ride-module/models/rideInstance.js";
import RideModel from "./../modules/ride-module/models/rideModel.js";
import Booking from "./../modules/booking-module/models/booking.js";
import User from "./../modules/user-module/models/user.js";
import Payment from "./../modules/payment-module/models/payment.js";
import AuditLog from "./../modules/audit-module/models/auditLog.js";
import AuditAction from "./../modules/audit-module/models/actionType.js";
import PassengerProfile from "./../modules/user-module/models/passengerProfile.js";
import DriverProfile from "./../modules/user-module/models/driverProfile.js";
import DriverApplication from "./../modules/user-module/models/driverApplication.js";
import Role from "./../modules/user-module/models/role.js"; // Import Role
// import Permission from "./../modules/user-module/models/permission.js"; // If needed later

RideModel.hasMany(RideInstance, { foreignKey: "rideId" });
RideInstance.belongsTo(RideModel, { foreignKey: "rideId" });
RideInstance.hasMany(Booking, { foreignKey: "rideInstanceId" });

Booking.belongsTo(PassengerProfile, { foreignKey: "userId" });
Booking.belongsTo(RideInstance, { foreignKey: "rideInstanceId" });
PassengerProfile.hasMany(Booking, { foreignKey: "userId" });

RideModel.belongsTo(DriverProfile, { foreignKey: "driverId" });
DriverProfile.hasMany(RideModel, { foreignKey: "driverId" });

PassengerProfile.hasMany(DriverApplication, { foreignKey: "userId" });
DriverApplication.belongsTo(PassengerProfile, {
    foreignKey: "userId",
    as: "passengerProfile",
});

Payment.belongsTo(Booking, { foreignKey: "bookingId" });
Booking.hasOne(Payment, { foreignKey: "bookingId" });

User.hasMany(AuditLog, { foreignKey: "userId" });

// User associations
User.hasOne(PassengerProfile, { as: "passengerProfile", foreignKey: "userId" });
PassengerProfile.belongsTo(User, { as: "user", foreignKey: "userId" });
User.hasOne(DriverProfile, { as: "driverProfile", foreignKey: "userId" });
DriverProfile.belongsTo(User, { as: "user", foreignKey: "userId" });

export {
    User,
    RideModel,
    Booking,
    RideInstance,
    DriverApplication,
    Payment,
    AuditAction,
    AuditLog,
    PassengerProfile,
    DriverProfile,
    Role,
};
