// tests/unit/rideFacade.test.js
import { jest } from '@jest/globals';
import rideFacade from '../../src/modules/ride-module/facades/rideFacade.js';

// --- Mocking rideService.js ---
const mockGetAllRides = jest.fn();
const mockGetRideById = jest.fn();
const mockCreateRide = jest.fn();
const mockUpdateRide = jest.fn();
const mockDeleteRide = jest.fn();
const mockGetAllRideInstances = jest.fn();
const mockGetRideInstanceById = jest.fn();
const mockCreateRideInstance = jest.fn();
const mockUpdateRideInstance = jest.fn();
const mockDeleteRideInstance = jest.fn();
const mockAcceptRide = jest.fn();
const mockRejectRide = jest.fn();
const mockCompleteRide = jest.fn();

jest.mock('../../src/modules/ride-module/services/rideService.js', () => ({
    __esModule: true,
    default: {
        getAllRides: mockGetAllRides,
        getRideById: mockGetRideById,
        createRide: mockCreateRide,
        updateRide: mockUpdateRide,
        deleteRide: mockDeleteRide,
        getAllRideInstances: mockGetAllRideInstances,
        getRideInstanceById: mockGetRideInstanceById,
        createRideInstance: mockCreateRideInstance,
        updateRideInstance: mockUpdateRideInstance,
        deleteRideInstance: mockDeleteRideInstance,
        acceptRide: mockAcceptRide,
        rejectRide: mockRejectRide,
        completeRide: mockCompleteRide,
    },
}));

describe('Ride Facade', () => {
    beforeEach(() => {
        // Clear all service mocks
        mockGetAllRides.mockClear();
        mockGetRideById.mockClear();
        mockCreateRide.mockClear();
        mockUpdateRide.mockClear();
        mockDeleteRide.mockClear();
        mockGetAllRideInstances.mockClear();
        mockGetRideInstanceById.mockClear();
        mockCreateRideInstance.mockClear();
        mockUpdateRideInstance.mockClear();
        mockDeleteRideInstance.mockClear();
        mockAcceptRide.mockClear();
        mockRejectRide.mockClear();
        mockCompleteRide.mockClear();
    });

    const testCases = [
        { method: 'getAllRides', mock: mockGetAllRides, args: [] },
        { method: 'getRideById', mock: mockGetRideById, args: ['r1'] },
        { method: 'createRide', mock: mockCreateRide, args: [{ data: 'newData' }] },
        { method: 'updateRide', mock: mockUpdateRide, args: ['r1', { data: 'updateData' }] },
        { method: 'deleteRide', mock: mockDeleteRide, args: ['r1'] },
        { method: 'getAllRideInstances', mock: mockGetAllRideInstances, args: [] },
        { method: 'getRideInstanceById', mock: mockGetRideInstanceById, args: ['ri1'] },
        { method: 'createRideInstance', mock: mockCreateRideInstance, args: [{ data: 'newInstanceData' }] },
        { method: 'updateRideInstance', mock: mockUpdateRideInstance, args: ['ri1', { data: 'updateInstanceData' }] },
        { method: 'deleteRideInstance', mock: mockDeleteRideInstance, args: ['ri1'] },
        { method: 'acceptRide', mock: mockAcceptRide, args: ['r1'] },
        { method: 'rejectRide', mock: mockRejectRide, args: ['r1'] },
        { method: 'completeRide', mock: mockCompleteRide, args: ['r1'] },
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
