const rideRatingController = require('../../src/modules/rideRating-module/controllers/rideRatingController');
const {User, RideInstance} = require('../../src/config/index');
jest.mock('../../src/modules/user-module/models/user');
jest.mock('../../src/modules/ride-module/models/rideInstance');
jest.mock('../../src/modules/ride-module/models/rideModel');
jest.mock('../../src/modules/rideRating-module/models/rideRating');
jest.mock('../../src/modules/booking-module/models/booking');

const mockReply = () => {
  const res = {};
  res.send = jest.fn().mockReturnValue(res);
  res.code = jest.fn().mockReturnValue(res);
  return res;
};

describe('rideRatingController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should rate a ride', async () => {
    User.findByPk.mockResolvedValue({ id: 1 });
    RideInstance.findByPk.mockResolvedValue({ id: 2 });
    // Mock the service method to avoid setUser error
    jest.spyOn(require('../../src/modules/rideRating-module/services/rideRatingService'), 'rateRide').mockResolvedValue({ rideRating: { id: 3 }, avgRating: 4.5 });
    const reply = mockReply();
    await rideRatingController.rateRide({ params: { id: 2 }, body: { userId: 1, rating: 5, comment: 'Good' } }, reply);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Ride rated', rating: { id: 3 }, average: 4.5 });
  });

  it('should return 404 if user not found', async () => {
    User.findByPk.mockResolvedValue(null);
    const reply = mockReply();
    await rideRatingController.rateRide({ params: { id: 2 }, body: { userId: 1, rating: 5, comment: 'Good' } }, reply);
    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should return 404 if rideInstance not found', async () => {
    User.findByPk.mockResolvedValue({ id: 1 });
    RideInstance.findByPk.mockResolvedValue(null);
    const reply = mockReply();
    await rideRatingController.rateRide({ params: { id: 2 }, body: { userId: 1, rating: 5, comment: 'Good' } }, reply);
    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'RideInstance not found' });
  });
});
