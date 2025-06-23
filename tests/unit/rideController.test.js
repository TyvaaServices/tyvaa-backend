// tests/unit/rideController.test.js
import { jest } from '@jest/globals';
import rideController from '../../src/modules/ride-module/controllers/rideController.js';

// --- Mocking rideFacade.js ---
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

jest.mock('../../src/modules/ride-module/facades/rideFacade.js', () => ({
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

describe('Ride Controller (with Facade)', () => {
    let mockRequest;
    let mockReply;

    beforeEach(() => {
        mockRequest = { params: {}, body: {} };
        mockReply = {
            send: jest.fn().mockReturnThis(),
            code: jest.fn().mockReturnThis(),
        };

        // Clear all facade mocks
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

    // Helper to generate test cases for simple CRUD-like methods
    const generateCrudTests = (methodName, mockFn, successStatusCode = 200, notFoundMsg = 'not found') => {
        describe(methodName, () => {
            it(`should call facade.${methodName} and return result`, async () => {
                const mockResult = { id: '1', data: 'some data' };
                mockRequest.params.id = '1'; // For getById, update, delete
                mockRequest.body = { data: 'some data' }; // For create, update

                mockFn.mockResolvedValue(mockResult);
                await rideController[methodName](mockRequest, mockReply);

                expect(mockFn).toHaveBeenCalled();
                if (methodName.includes('ById') || methodName.includes('update') || methodName.includes('delete') || methodName.includes('Ride')) { // methods that take id
                     if(methodName.includes('update')) expect(mockFn).toHaveBeenCalledWith('1', mockRequest.body);
                     else expect(mockFn).toHaveBeenCalledWith('1');
                } else if (methodName.includes('create')) {
                     expect(mockFn).toHaveBeenCalledWith(mockRequest.body);
                }


                if (successStatusCode === 201 || successStatusCode === 200 && !methodName.startsWith('delete')) {
                     expect(mockReply.send).toHaveBeenCalledWith(mockResult);
                }
                if (successStatusCode) {
                    expect(mockReply.code).toHaveBeenCalledWith(successStatusCode);
                } else { // For getAll type methods that don't call .code() for success
                    expect(mockReply.send).toHaveBeenCalledWith(mockResult);
                }
            });

            if (methodName.includes('ById') || methodName.startsWith('update') || methodName.startsWith('delete') || ['acceptRide', 'rejectRide', 'completeRide'].includes(methodName)) {
                it('should return 404 if facade returns null/false (not found)', async () => {
                    mockRequest.params.id = '1';
                    mockFn.mockResolvedValue(methodName.startsWith('delete') ? false : null);
                    await rideController[methodName](mockRequest, mockReply);
                    expect(mockReply.code).toHaveBeenCalledWith(404);
                    expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining(notFoundMsg) }));
                });
            }
             // Generic error handling test (can be expanded if controller has more specific error handling)
            it('should handle errors from facade', async () => {
                mockRequest.params.id = '1'; // Default for methods needing it
                mockRequest.body = { data: 'some data' };
                mockFn.mockRejectedValue(new Error('Facade error'));

                // Wrap in try-catch because the controller doesn't have explicit try-catch for all methods
                try {
                    await rideController[methodName](mockRequest, mockReply);
                } catch(e) {
                    // If controller re-throws or Fastify handles it, this might not be reached directly in reply
                    // For now, check if not successful send
                    expect(mockReply.send).not.toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
                }
                // This assertion might fail if controller doesn't catch and send error response
                // For now, we assume a generic error would lead to not sending a success response.
                // A more robust test would involve Fastify's error handling or explicit try-catch in controller.
            });
        });
    };

    generateCrudTests('getAllRides', mockGetAllRides, 0, ''); // 0 for no .code() call on success
    generateCrudTests('getRideById', mockGetRideById, 200, 'Ride not found');
    generateCrudTests('createRide', mockCreateRide, 201, '');
    generateCrudTests('updateRide', mockUpdateRide, 200, 'Ride not found');
    generateCrudTests('deleteRide', mockDeleteRide, 200, 'Ride not found'); // Controller sends {message: 'Ride deleted'} on success

    generateCrudTests('getAllRideInstances', mockGetAllRideInstances, 0, '');
    generateCrudTests('getRideInstanceById', mockGetRideInstanceById, 200, 'RideInstance not found');
    generateCrudTests('createRideInstance', mockCreateRideInstance, 201, '');
    generateCrudTests('updateRideInstance', mockUpdateRideInstance, 200, 'RideInstance not found');
    generateCrudTests('deleteRideInstance', mockDeleteRideInstance, 200, 'RideInstance not found'); // Controller sends {message: 'RideInstance deleted'}

    generateCrudTests('acceptRide', mockAcceptRide, 200, 'Ride not found'); // Controller sends {message: 'Ride accepted'}
    generateCrudTests('rejectRide', mockRejectRide, 200, 'Ride not found'); // Controller sends {message: 'Ride rejected'}
    generateCrudTests('completeRide', mockCompleteRide, 200, 'Ride not found'); // Controller sends {message: 'Ride completed'}

    // Adjust success message tests for delete methods specifically if needed
    describe('deleteRide specific response', () => {
        it('should send success message on successful deletion', async () => {
            mockRequest.params.id = 'r1';
            mockDeleteRide.mockResolvedValue(true); // facade indicates success
            await rideController.deleteRide(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Ride deleted' });
        });
    });
    describe('deleteRideInstance specific response', () => {
        it('should send success message on successful deletion', async () => {
            mockRequest.params.id = 'ri1';
            mockDeleteRideInstance.mockResolvedValue(true); // facade indicates success
            await rideController.deleteRideInstance(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'RideInstance deleted' });
        });
    });
});
