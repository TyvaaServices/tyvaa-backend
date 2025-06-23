// tests/unit/rideController.test.js
import {describe, expect, jest} from '@jest/globals';

// --- Mocking rideFacade.js ---
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
    acceptRide: jest.fn(),
    rejectRide: jest.fn(),
    completeRide: jest.fn(),
};

jest.unstable_mockModule('../../src/modules/ride-module/facades/rideFacade.js', () => ({
    __esModule: true,
    default: mockRideFacade,
}));
jest.unstable_mockModule('sequelize', () => ({
    __esModule: true,
    Sequelize: class {},
}));

describe('Ride Controller (with Facade)', () => {
    let mockRequest;
    let mockReply;
    let rideController;

    beforeEach(async () => {
        mockRequest = { params: {}, body: {} };
        mockReply = {
            send: jest.fn().mockReturnThis(),
            code: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };
        Object.values(mockRideFacade).forEach(fn => fn.mockReset());
        rideController = (await import('../../src/modules/ride-module/controllers/rideController.js')).default;
    });

    describe('getAllRides', () => {
        it('should return rides on success', async () => {
            const rides = [{ id: 1 }, { id: 2 }];
            mockRideFacade.getAllRides.mockResolvedValueOnce(rides);
            await rideController.getAllRides(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith(rides);
        });
        it('should throw on error', async () => {
            mockRideFacade.getAllRides.mockRejectedValueOnce(new Error('fail'));
            await expect(rideController.getAllRides(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('getRideById', () => {
        it('should return ride on success', async () => {
            const ride = { id: 1 };
            mockRideFacade.getRideById.mockResolvedValueOnce(ride);
            mockRequest.params.id = '1';
            await rideController.getRideById(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith(ride);
        });
        it('should return 404 if not found', async () => {
            mockRideFacade.getRideById.mockResolvedValueOnce(null);
            mockRequest.params.id = '1';
            await rideController.getRideById(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ride not found' });
        });
        it('should throw on error', async () => {
            mockRideFacade.getRideById.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            await expect(rideController.getRideById(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('createRide', () => {
        it('should create ride and return result', async () => {
            const ride = { id: 1 };
            mockRideFacade.createRide.mockResolvedValueOnce(ride);
            mockRequest.body = { data: 'test' };
            await rideController.createRide(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith(ride);
        });
        it('should throw on error', async () => {
            mockRideFacade.createRide.mockRejectedValueOnce(new Error('fail'));
            mockRequest.body = { data: 'test' };
            await expect(rideController.createRide(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('updateRide', () => {
        it('should update ride and return result', async () => {
            const ride = { id: 1 };
            mockRideFacade.updateRide.mockResolvedValueOnce(ride);
            mockRequest.params.id = '1';
            mockRequest.body = { data: 'update' };
            await rideController.updateRide(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith(ride);
        });
        it('should handle not found', async () => {
            mockRideFacade.updateRide.mockResolvedValueOnce(null);
            mockRequest.params.id = '1';
            mockRequest.body = { data: 'update' };
            await rideController.updateRide(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ride not found' });
        });
        it('should throw on error', async () => {
            mockRideFacade.updateRide.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            mockRequest.body = { data: 'update' };
            await expect(rideController.updateRide(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('deleteRide', () => {
        it('should return message on success', async () => {
            mockRideFacade.deleteRide.mockResolvedValueOnce(true);
            mockRequest.params.id = '1';
            await rideController.deleteRide(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Ride deleted' });
        });
        it('should handle not found', async () => {
            mockRideFacade.deleteRide.mockResolvedValueOnce(false);
            mockRequest.params.id = '1';
            await rideController.deleteRide(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ride not found' });
        });
        it('should throw on error', async () => {
            mockRideFacade.deleteRide.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            await expect(rideController.deleteRide(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('getAllRideInstances', () => {
        it('should return ride instances on success', async () => {
            const rideInstances = [{ id: 1 }, { id: 2 }];
            mockRideFacade.getAllRideInstances.mockResolvedValueOnce(rideInstances);
            await rideController.getAllRideInstances(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith(rideInstances);
        });
        it('should handle errors', async () => {
            mockRideFacade.getAllRideInstances.mockRejectedValueOnce(new Error('fail'));
            await expect(rideController.getAllRideInstances(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('getRideInstanceById', () => {
        it('should return ride instance on success', async () => {
            const rideInstance = { id: 1 };
            mockRideFacade.getRideInstanceById.mockResolvedValueOnce(rideInstance);
            mockRequest.params.id = '1';
            await rideController.getRideInstanceById(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith(rideInstance);
        });
        it('should return 404 if not found', async () => {
            mockRideFacade.getRideInstanceById.mockResolvedValueOnce(null);
            mockRequest.params.id = '1';
            await rideController.getRideInstanceById(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'RideInstance not found' });
        });
        it('should handle errors', async () => {
            mockRideFacade.getRideInstanceById.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            await expect(rideController.getRideInstanceById(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('createRideInstance', () => {
        it('should create ride instance and return result', async () => {
            const rideInstance = { id: 1 };
            mockRideFacade.createRideInstance.mockResolvedValueOnce(rideInstance);
            mockRequest.body = { data: 'test' };
            await rideController.createRideInstance(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith(rideInstance);
        });
        it('should handle errors', async () => {
            mockRideFacade.createRideInstance.mockRejectedValueOnce(new Error('fail'));
            mockRequest.body = { data: 'test' };
            await expect(rideController.createRideInstance(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('updateRideInstance', () => {
        it('should update ride instance and return result', async () => {
            const rideInstance = { id: 1 };
            mockRideFacade.updateRideInstance.mockResolvedValueOnce(rideInstance);
            mockRequest.params.id = '1';
            mockRequest.body = { data: 'update' };
            await rideController.updateRideInstance(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith(rideInstance);
        });
        it('should handle not found', async () => {
            mockRideFacade.updateRideInstance.mockResolvedValueOnce(null);
            mockRequest.params.id = '1';
            mockRequest.body = { data: 'update' };
            await rideController.updateRideInstance(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'RideInstance not found' });
        });
        it('should handle errors', async () => {
            mockRideFacade.updateRideInstance.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            mockRequest.body = { data: 'update' };
            await expect(rideController.updateRideInstance(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('deleteRideInstance', () => {
        it('should return message on success', async () => {
            mockRideFacade.deleteRideInstance.mockResolvedValueOnce(true);
            mockRequest.params.id = '1';
            await rideController.deleteRideInstance(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'RideInstance deleted' });
        });
        it('should handle not found', async () => {
            mockRideFacade.deleteRideInstance.mockResolvedValueOnce(false);
            mockRequest.params.id = '1';
            await rideController.deleteRideInstance(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'RideInstance not found' });
        });
        it('should handle errors', async () => {
            mockRideFacade.deleteRideInstance.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            await expect(rideController.deleteRideInstance(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('acceptRide', () => {
        it('should accept ride and return result', async () => {
            mockRideFacade.acceptRide.mockResolvedValueOnce(true);
            mockRequest.params.id = '1';
            await rideController.acceptRide(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Ride accepted' });
        });
        it('should handle not found', async () => {
            mockRideFacade.acceptRide.mockResolvedValueOnce(false);
            mockRequest.params.id = '1';
            await rideController.acceptRide(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ride not found' });
        });
        it('should handle errors', async () => {
            mockRideFacade.acceptRide.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            await expect(rideController.acceptRide(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('rejectRide', () => {
        it('should reject ride and return result', async () => {
            mockRideFacade.rejectRide.mockResolvedValueOnce(true);
            mockRequest.params.id = '1';
            await rideController.rejectRide(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Ride rejected' });
        });
        it('should handle not found', async () => {
            mockRideFacade.rejectRide.mockResolvedValueOnce(false);
            mockRequest.params.id = '1';
            await rideController.rejectRide(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ride not found' });
        });
        it('should handle errors', async () => {
            mockRideFacade.rejectRide.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            await expect(rideController.rejectRide(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });

    describe('completeRide', () => {
        it('should complete ride and return result', async () => {
            mockRideFacade.completeRide.mockResolvedValueOnce(true);
            mockRequest.params.id = '1';
            await rideController.completeRide(mockRequest, mockReply);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Ride completed' });
        });
        it('should handle not found', async () => {
            mockRideFacade.completeRide.mockResolvedValueOnce(false);
            mockRequest.params.id = '1';
            await rideController.completeRide(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ride not found' });
        });
        it('should handle errors', async () => {
            mockRideFacade.completeRide.mockRejectedValueOnce(new Error('fail'));
            mockRequest.params.id = '1';
            await expect(rideController.completeRide(mockRequest, mockReply)).rejects.toThrow('fail');
        });
    });
});
