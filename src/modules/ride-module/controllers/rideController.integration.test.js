// const fastify = require('fastify');
// const rideRoutes = require('../routes/rideRouter');
// const ride = require('../models/rideModel');
//
// jest.mock('../models/rideModel');
//
// describe('Ride Service Integration', () => {
//   let app;
//   beforeAll(async () => {
//     app = fastify();
//     app.register(rideRoutes);
//     await app.ready();
//   });
//
//   afterAll(async () => {
//     await app.close();
//   });
//
//   it('GET /rides should return all rides', async () => {
//     const rides = [{ id: 1, departure: 'A', destination: 'B' }];
//     ride.findAll.mockResolvedValue(rides);
//     const response = await app.inject({ method: 'GET', url: '/rides' });
//     expect(response.statusCode).toBe(200);
//     expect(JSON.parse(response.payload)).toEqual({ rides });
//   });
//
//   it('GET /rides/:id should return ride details if found', async () => {
//     const rideDetails = { id: 1, departure: 'A', destination: 'B' };
//     ride.findByPk.mockResolvedValue(rideDetails);
//     const response = await app.inject({ method: 'GET', url: '/rides/1' });
//     expect(response.statusCode).toBe(200);
//     expect(JSON.parse(response.payload)).toEqual({ rideDetails });
//   });
//
//   it('GET /rides/:id should return 404 if not found', async () => {
//     ride.findByPk.mockResolvedValue(null);
//     const response = await app.inject({ method: 'GET', url: '/rides/999' });
//     expect(response.statusCode).toBe(404);
//     expect(JSON.parse(response.payload)).toEqual({ error: 'Ride not found' });
//   });
// });
//
