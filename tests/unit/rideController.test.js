const mockRideFacade = {
  getAllRides: jest.fn(),
  getRideById: jest.fn(),
  createRide: jest.fn(),
  updateRide: jest.fn(),
  deleteRide: jest.fn(),
  getAllRideInstances: jest.fn(),
  getRideInstanceById: jest.fn(),
  createRideInstance: jest.fn(),
  updateRideInstance: jest.fn(),
  deleteRideInstance: jest.fn(),
};

jest.unstable_mockModule('../../src/modules/ride-module/facades/rideFacade.js', () => ({
  default: mockRideFacade,
}));
import {afterAll, describe, expect, jest} from '@jest/globals';

const reply = () => {
  const res = {};
  res.send = jest.fn().mockReturnValue(res);
  res.code = jest.fn().mockReturnValue(res);
  return res;
};

let controller;
beforeAll(async () => {
  const { default: rideController } = await import('../../src/modules/ride-module/controllers/rideController.js');
  controller = rideController;
});

describe('rideController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockRideFacade).forEach(key => {
      mockRideFacade[key].mockReset();
      mockRideFacade[key].mockResolvedValue(undefined);
    });
  });

  describe('getAllRides', () => {
    it('should return rides on success', async () => {
      const rides = [{ id: 1 }, { id: 2 }];
      mockRideFacade.getAllRides.mockResolvedValueOnce(rides);
      const res = reply();
      await controller.getAllRides({}, res);
      expect(res.send).toHaveBeenCalledWith(rides);
    });
  });

  describe('getRideById', () => {
    it('should return ride if found', async () => {
      const ride = { id: 1 };
      mockRideFacade.getRideById.mockResolvedValueOnce(ride);
      const res = reply();
      await controller.getRideById({ params: { id: 1 } }, res);
      expect(res.send).toHaveBeenCalledWith(ride);
    });
    it('should return 404 if not found', async () => {
      mockRideFacade.getRideById.mockResolvedValueOnce(null);
      const res = reply();
      await controller.getRideById({ params: { id: 1 } }, res);
      expect(res.code).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'Ride not found' });
    });
  });

  describe('createRide', () => {
    it('should create a ride and return 201', async () => {
      const ride = { id: 1, name: 'Test Ride' };
      mockRideFacade.createRide.mockResolvedValueOnce(ride);
      const res = reply();
      await controller.createRide({ body: { name: 'Test Ride' } }, res);
      expect(res.code).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(ride);
    });
  });

  describe('updateRide', () => {
    it('should update a ride if found', async () => {
      const ride = { id: 1, name: 'Updated Ride' };
      mockRideFacade.updateRide.mockResolvedValueOnce(ride);
      const res = reply();
      await controller.updateRide({ params: { id: 1 }, body: { name: 'Updated Ride' } }, res);
      expect(res.send).toHaveBeenCalledWith(ride);
    });
    it('should return 404 if ride not found', async () => {
      mockRideFacade.updateRide.mockResolvedValueOnce(null);
      const res = reply();
      await controller.updateRide({ params: { id: 1 }, body: { name: 'Updated Ride' } }, res);
      expect(res.code).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'Ride not found' });
    });
  });

  describe('deleteRide', () => {
    it('should delete a ride if found', async () => {
      mockRideFacade.deleteRide.mockResolvedValueOnce(true);
      const res = reply();
      await controller.deleteRide({ params: { id: 1 } }, res);
      expect(res.send).toHaveBeenCalledWith({ message: 'Ride deleted' });
    });
    it('should return 404 if ride not found', async () => {
      mockRideFacade.deleteRide.mockResolvedValueOnce(false);
      const res = reply();
      await controller.deleteRide({ params: { id: 1 } }, res);
      expect(res.code).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'Ride not found' });
    });
  });

  // Similar tests for RideInstance CRUD
  describe('getAllRideInstances', () => {
    it('should return ride instances', async () => {
      const instances = [{ id: 1 }];
      mockRideFacade.getAllRideInstances.mockResolvedValueOnce(instances);
      const res = reply();
      await controller.getAllRideInstances({}, res);
      expect(res.send).toHaveBeenCalledWith(instances);
    });
  });

  describe('getRideInstanceById', () => {
    it('should return ride instance if found', async () => {
      const instance = { id: 1 };
      mockRideFacade.getRideInstanceById.mockResolvedValueOnce(instance);
      const res = reply();
      await controller.getRideInstanceById({ params: { id: 1 } }, res);
      expect(res.send).toHaveBeenCalledWith(instance);
    });
    it('should return 404 if not found', async () => {
      mockRideFacade.getRideInstanceById.mockResolvedValueOnce(null);
      const res = reply();
      await controller.getRideInstanceById({ params: { id: 1 } }, res);
      expect(res.code).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'RideInstance not found' });
    });
  });

  describe('createRideInstance', () => {
    it('should create and return ride instance', async () => {
      const instance = { id: 1 };
      mockRideFacade.createRideInstance.mockResolvedValueOnce(instance);
      const res = reply();
      await controller.createRideInstance({ body: {} }, res);
      expect(res.code).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(instance);
    });
  });

  describe('updateRideInstance', () => {
    it('should update and return ride instance', async () => {
      const instance = { id: 1 };
      mockRideFacade.updateRideInstance.mockResolvedValueOnce(instance);
      const res = reply();
      await controller.updateRideInstance({ params: { id: 1 }, body: {} }, res);
      expect(res.send).toHaveBeenCalledWith(instance);
    });
    it('should return 404 if not found', async () => {
      mockRideFacade.updateRideInstance.mockResolvedValueOnce(null);
      const res = reply();
      await controller.updateRideInstance({ params: { id: 1 }, body: {} }, res);
      expect(res.code).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'RideInstance not found' });
    });
  });

  describe('deleteRideInstance', () => {
    it('should delete and return message', async () => {
      mockRideFacade.deleteRideInstance.mockResolvedValueOnce(true);
      const res = reply();
      await controller.deleteRideInstance({ params: { id: 1 } }, res);
      expect(res.send).toHaveBeenCalledWith({ message: 'RideInstance deleted' });
    });
    it('should return 404 if not found', async () => {
      mockRideFacade.deleteRideInstance.mockResolvedValueOnce(false);
      const res = reply();
      await controller.deleteRideInstance({ params: { id: 1 } }, res);
      expect(res.code).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'RideInstance not found' });
    });
  });

  describe('rejectRide', () => {
    it('should reject a ride if found', async () => {
      mockRideFacade.rejectRide = jest.fn().mockResolvedValueOnce(true);
      const res = reply();
      await controller.rejectRide({ params: { id: 1 } }, res);
      expect(res.send).toHaveBeenCalledWith({ message: 'Ride rejected' });
    });
    it('should return 404 if ride not found', async () => {
      mockRideFacade.rejectRide = jest.fn().mockResolvedValueOnce(false);
      const res = reply();
      await controller.rejectRide({ params: { id: 1 } }, res);
      expect(res.code).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'Ride not found' });
    });
  });

  describe('completeRide', () => {
    it('should complete a ride if found', async () => {
      mockRideFacade.completeRide = jest.fn().mockResolvedValueOnce(true);
      const res = reply();
      await controller.completeRide({ params: { id: 1 } }, res);
      expect(res.send).toHaveBeenCalledWith({ message: 'Ride completed' });
    });
    it('should return 404 if ride not found', async () => {
      mockRideFacade.completeRide = jest.fn().mockResolvedValueOnce(false);
      const res = reply();
      await controller.completeRide({ params: { id: 1 } }, res);
      expect(res.code).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'Ride not found' });
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });
});
