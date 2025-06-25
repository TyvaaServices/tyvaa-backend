import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

const mockRideService = {
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
  acceptRide: jest.fn(),
  rejectRide: jest.fn(),
  completeRide: jest.fn(),
};
const mockRideModel = { findByPk: jest.fn(), create: jest.fn(), update: jest.fn(), destroy: jest.fn() };
const mockRideInstanceModel = { findByPk: jest.fn(), create: jest.fn(), update: jest.fn(), destroy: jest.fn() };

jest.unstable_mockModule('../../src/modules/ride-module/services/rideService.js', () => ({
  __esModule: true,
  default: mockRideService,
}));
jest.unstable_mockModule('../../src/modules/ride-module/models/rideModel.js', () => ({
  __esModule: true,
  default: mockRideModel,
}));
jest.unstable_mockModule('../../src/modules/ride-module/models/rideInstance.js', () => ({
  __esModule: true,
  default: mockRideInstanceModel,
}));
jest.unstable_mockModule('sequelize', () => ({
  __esModule: true,
  Sequelize: class {},
  DataTypes: {
    STRING: 'STRING',
    INTEGER: 'INTEGER',
    DATE: 'DATE',
    BOOLEAN: 'BOOLEAN',
    ENUM: (...args) => ({ type: 'ENUM', values: args }),
  },
  define: () => ({}),
}));
jest.unstable_mockModule('../../src/modules/booking-module/models/booking.js', () => ({
  __esModule: true,
  default: {},
}));

let rideFacade;
beforeAll(async () => {
  rideFacade = (await import('../../src/modules/ride-module/facades/rideFacade.js')).default;
});

describe('Ride Facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testCases = [
    { method: 'getAllRides', mock: mockRideService.getAllRides, args: [] },
    { method: 'getRideById', mock: mockRideService.getRideById, args: ['r1'] },
    { method: 'createRide', mock: mockRideService.createRide, args: [{ data: 'newData' }] },
    { method: 'updateRide', mock: mockRideService.updateRide, args: ['r1', { data: 'updateData' }] },
    { method: 'deleteRide', mock: mockRideService.deleteRide, args: ['r1'] },
    { method: 'getAllRideInstances', mock: mockRideService.getAllRideInstances, args: [] },
    { method: 'getRideInstanceById', mock: mockRideService.getRideInstanceById, args: ['ri1'] },
    { method: 'createRideInstance', mock: mockRideService.createRideInstance, args: [{ data: 'newInstanceData' }] },
    { method: 'updateRideInstance', mock: mockRideService.updateRideInstance, args: ['ri1', { data: 'updateInstanceData' }] },
    { method: 'deleteRideInstance', mock: mockRideService.deleteRideInstance, args: ['ri1'] },
    { method: 'acceptRide', mock: mockRideService.acceptRide, args: ['r1'] },
    { method: 'rejectRide', mock: mockRideService.rejectRide, args: ['r1'] },
    { method: 'completeRide', mock: mockRideService.completeRide, args: ['r1'] },
  ];

  testCases.forEach(({ method, mock, args }) => {
    describe(method, () => {
      it(`should call rideService.${method} and return its result`, async () => {
        const mockResult = { id: args[0] || 'id', success: true, method };
        mock.mockResolvedValue(mockResult);
        const result = await rideFacade[method](...args);
        expect(mock).toHaveBeenCalledTimes(1);
        if (args.length > 0) {
          expect(mock).toHaveBeenCalledWith(...args);
        }
        expect(result).toEqual(mockResult);
      });
      it(`should propagate errors from rideService.${method}`, async () => {
        const errorMessage = `Service error in ${method}`;
        mock.mockRejectedValue(new Error(errorMessage));
        await expect(rideFacade[method](...args)).rejects.toThrow(errorMessage);
        expect(mock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
