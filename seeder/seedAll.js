import sequelize from '#config/db.js';

import {User, RideModel, Booking, RideInstance, Payment, PassengerProfile, DriverProfile,DriverApplication,AuditAction} from '#config/index.js';

async function seed() {
  await sequelize.sync({ force: true,logging: false });


  const users = await User.bulkCreate([
    {
      phoneNumber: '+12345678901',
      fullName: 'Ouly Diallo',
      fcmToken: 'token1',
      driverLicense: 'DL12345',
      profileImage: 'ouly.jpg',
      sexe: 'female',
      dateOfBirth: new Date('2004-01-08'),
      email: 'ouly@cheikh.com',
      isActive: true,
    },
    {
      phoneNumber: '+12345678902',
      fullName: 'Cheikh Traore',
      fcmToken: 'token2',
      driverLicense: 'DL54321',
      profileImage: 'cheikh.jpg',
      sexe: 'male',
      dateOfBirth: new Date('2001-10-02'),
      email: 'cheikh@ouly.com',
      isActive: true,
    },
    {
      email: "cheikh.traore@tyvaa.live",
      fullName: "Cheikh Traore",
      sexe: "male",
      dateOfBirth: "20001-10-02",
      isActive: true,
      phoneNumber: "+12345678903",
      isAdmin: true,
    },
    {
      email: "houleymatou.diallo@tyvaa.live",
      fullName: "Houleymatou Diallo",
      sexe: "female",
      dateOfBirth: "2005-01-08",
        isActive: true,
        phoneNumber: "+12345678904",
        isAdmin: true,
    }
  ]);

  // Create passenger and driver profiles for each user (skip admins)
  const passengerProfiles = await Promise.all(users.map(user =>
    user.isAdmin ? null : PassengerProfile.create({ userId: user.id })
  ));
  const driverProfiles = await Promise.all(users.map(user =>
    user.isAdmin ? null : DriverProfile.create({ userId: user.id, statusProfile: 'Active' })
  ));

  await AuditAction.bulkCreate([
    { actionType: 'create', codeAction: 'C' },
    { actionType: 'update', codeAction: 'U' },
    { actionType: 'delete', codeAction: 'D' },
    { actionType: 'view', codeAction: 'V' },
    { actionType: 'exportsData', codeAction: 'E' },
    { actionType: 'login', codeAction: 'L' },
    { actionType: 'logout', codeAction: 'O' },
  ]);

  const rideModels = await RideModel.bulkCreate([
    {
      driverId: driverProfiles[0].id,
      departure: 'City A',
      destination: 'City B',
      seatsAvailable: 3,
      recurrence: ['Monday', 'Wednesday'],
      comment: 'Morning ride',
      price: 20,
      status: 'active',
      startDate: new Date('2025-06-20'),
      endDate: new Date('2025-07-20'),
    },
    {
      driverId: driverProfiles[1].id,
      departure: 'City C',
      destination: 'City D',
      seatsAvailable: 2,
      recurrence: ['Friday'],
      comment: 'Evening ride',
      price: 15,
      status: 'active',
      startDate: new Date('2025-06-22'),
      endDate: new Date('2025-07-22'),
    },
  ]);

  const rideInstances = await RideInstance.bulkCreate([
    {
      rideId: rideModels[0].id,
      rideDate: new Date('2025-06-21T08:00:00Z'),
      seatsAvailable: 3,
      seatsBooked: 1,
      status: 'scheduled',
    },
    {
      rideId: rideModels[1].id,
      rideDate: new Date('2025-06-23T18:00:00Z'),
      seatsAvailable: 2,
      seatsBooked: 0,
      status: 'scheduled',
    },
  ]);

  const bookings = await Booking.bulkCreate([
    {
      userId: passengerProfiles[1].id,
      rideInstanceId: rideInstances[0].id,
      seatsBooked: 1,
      status: 'booked',
    },
  ]);

  await Payment.bulkCreate([
    {
      bookingId: bookings[0].id,
      phone: users[1].phoneNumber,
      amount: 20.0,
      status: 'completed',
    },
  ]);

  // Seed AuditAction types


   await Promise.all(users.map(user =>
    user.isAdmin ? null : DriverApplication.create({
      status: 'pending',
      applicationDate: new Date(),
      documents: 'license.pdf',
      comments: 'Initial application',
      userId: user.id
    })
  ));



  // Seed audit actions
  await AuditAction.bulkCreate([
    { actionType: 'create', codeAction: 'CREATE' },
    { actionType: 'update', codeAction: 'UPDATE' },
    { actionType: 'delete', codeAction: 'DELETE' },
    { actionType: 'view', codeAction: 'VIEW' },
    { actionType: 'exportsData', codeAction: 'EXPORTS_DATA' },
    { actionType: 'login', codeAction: 'LOGIN' },
    { actionType: 'logout', codeAction: 'LOGOUT' },
  ]);
}

seed()
  .then(() => {
    console.log('Seeding successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
