const sequelize = require('../src/config/db');

const {User, RideModel, Booking, RideInstance, RideRating, Payment} = require('../src/config/index');

async function seed() {
  await sequelize.sync({ force: true,logging: false });

  const users = await User.bulkCreate([
    {
      phoneNumber: '+12345678901',
      fullName: 'Ouly Diallo',
      fcmToken: 'token1',
      driverLicense: 'DL12345',
      isOnline: true,
      profileImage: 'ouly.jpg',
      sexe: 'female',
      dateOfBirth: new Date('2004-01-08'),
      email: 'ouly@cheikh.com',
    },
    {
      phoneNumber: '+12345678902',
      fullName: 'Cheikh Traore',
      fcmToken: 'token2',
      driverLicense: 'DL54321',
      isOnline: false,
      profileImage: 'cheikh.jpg',
      sexe: 'male',
      dateOfBirth: new Date('2001-10-02'),
      email: 'cheikh@ouly.com',
    },
  ]);

  const rideModels = await RideModel.bulkCreate([
    {
      driverId: users[0].id,
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
      driverId: users[1].id,
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
      userId: users[1].id,
      rideInstanceId: rideInstances[0].id,
      seatsBooked: 1,
      status: 'booked',
    },
  ]);

  await RideRating.bulkCreate([
    {
      userId: users[1].id,
      rideInstanceId: rideInstances[0].id,
      rating: 5,
      comment: 'Great ride!'
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

  console.log('Seeding completed!');
  process.exit();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

