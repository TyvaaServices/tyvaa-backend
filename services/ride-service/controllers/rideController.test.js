// const rideController = require('./rideController');
// const ride = require('../models/rideModel');
// const rideParticipant = require('../models/rideParticipant');
//
// jest.mock('../models/rideModel');
// jest.mock('../models/rideParticipant');
//
// const mockReply = () => {
//   const res = {};
//   res.send = jest.fn().mockReturnValue(res);
//   res.status = jest.fn().mockReturnValue(res);
//   return res;
// };
//
// describe('rideController', () => {
//   describe('getAllRides', () => {
//     it('should return rides on success', async () => {
//       const rides = [{ id: 1, departure: 'A', destination: 'B' }];
//       ride.findAll.mockResolvedValue(rides);
//       const reply = mockReply();
//       await rideController.getAllRides({}, reply);
//       expect(reply.send).toHaveBeenCalledWith({ rides });
//     });
//
//     it('should handle errors and return 500', async () => {
//       ride.findAll.mockRejectedValue(new Error('DB error'));
//       const reply = mockReply();
//       await rideController.getAllRides({}, reply);
//       expect(reply.status).toHaveBeenCalledWith(500);
//       expect(reply.send).toHaveBeenCalledWith({ error: 'Erreur interne du serveur' });
//     });
//   });
//
//   describe('getRideById', () => {
//     it('should return ride details if found', async () => {
//       const rideDetails = { id: 1, departure: 'A', destination: 'B' };
//       ride.findByPk.mockResolvedValue(rideDetails);
//       const reply = mockReply();
//       await rideController.getRideById({ params: { id: 1 } }, reply);
//       expect(reply.send).toHaveBeenCalledWith({ rideDetails });
//     });
//
//     it('should return 404 if ride not found', async () => {
//       ride.findByPk.mockResolvedValue(null);
//       const reply = mockReply();
//       await rideController.getRideById({ params: { id: 1 } }, reply);
//       expect(reply.status).toHaveBeenCalledWith(404);
//       expect(reply.send).toHaveBeenCalledWith({ error: 'Ride not found' });
//     });
//
//     it('should handle errors and return 500', async () => {
//       ride.findByPk.mockRejectedValue(new Error('DB error'));
//       const reply = mockReply();
//       await rideController.getRideById({ params: { id: 1 } }, reply);
//       expect(reply.status).toHaveBeenCalledWith(500);
//       expect(reply.send).toHaveBeenCalledWith({ error: 'Erreur interne du serveur' });
//     });
//   });
// });
//
