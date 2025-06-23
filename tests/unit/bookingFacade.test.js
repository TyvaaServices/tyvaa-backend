// tests/unit/bookingFacade.test.js
import { jest } from '@jest/globals';
import bookingFacade from '../../src/modules/booking-module/facades/bookingFacade.js';
// User and RideInstance are imported by the facade from config/index.js
import { User, RideInstance } from '../../src/config/index.js';

// --- Mocking bookingService.js ---
// Define jest.fn() for each function exported by bookingService
const mockGetAllBookings = jest.fn();
const mockGetBookingById = jest.fn();
const mockCreateBooking = jest.fn();
const mockUpdateBooking = jest.fn();
const mockDeleteBooking = jest.fn();
const mockBookRide = jest.fn();
const mockCancelBooking = jest.fn();

// Mock the entire bookingService.js module.
// bookingFacade imports bookingService via default import: import bookingService from '...'
// So, the mock factory must provide a `default` property.
jest.mock('../../src/modules/booking-module/services/bookingService.js', () => {
    // console.log('!!! JEST.MOCK FOR BOOKING SERVICE IS RUNNING !!!'); // Diagnostic
    return {
        __esModule: true,
        default: {
            getAllBookings: mockGetAllBookings,
            getBookingById: mockGetBookingById,
            createBooking: mockCreateBooking,
            updateBooking: mockUpdateBooking,
            deleteBooking: mockDeleteBooking,
            bookRide: mockBookRide,
            cancelBooking: mockCancelBooking,
        }
    };
});

// --- Mocking config/index.js (for User and RideInstance models) ---
// This mock needs to be effective for when bookingFacade imports User and RideInstance
const mockUserFindByPk = jest.fn();
const mockRideInstanceFindByPk = jest.fn();

jest.mock('../../src/config/index.js', () => ({
    __esModule: true,
    User: { findByPk: mockUserFindByPk },
    RideInstance: { findByPk: mockRideInstanceFindByPk },
}));


describe('Booking Facade', () => {
    beforeEach(() => {
        // Reset model mocks first
        mockUserFindByPk.mockReset();
        mockRideInstanceFindByPk.mockReset();

        // Clear all service mocks
        mockGetAllBookings.mockClear();
        mockGetBookingById.mockClear();
        mockCreateBooking.mockClear();
        mockUpdateBooking.mockClear();
        mockDeleteBooking.mockClear();
        mockBookRide.mockClear();
        mockCancelBooking.mockClear();
    });

    describe('getAllBookings', () => {
        it('should call bookingService.getAllBookings and return its result', async () => {
            const mockBookings = [{ id: '1', details: 'Booking 1' }];
            mockGetAllBookings.mockResolvedValue(mockBookings);
            const result = await bookingFacade.getAllBookings();
            expect(mockGetAllBookings).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockBookings);
        });
    });

    describe('getBookingById', () => {
        it('should call bookingService.getBookingById and return booking if found', async () => {
            const mockBooking = { id: '1', details: 'Booking 1' };
            mockGetBookingById.mockResolvedValue(mockBooking);
            const result = await bookingFacade.getBookingById('1');
            expect(mockGetBookingById).toHaveBeenCalledWith('1');
            expect(result).toEqual(mockBooking);
        });

        it('should return null if bookingService.getBookingById returns null', async () => {
            mockGetBookingById.mockResolvedValue(null);
            const result = await bookingFacade.getBookingById('1');
            expect(result).toBeNull();
        });
    });

    describe('createBooking', () => {
        it('should call bookingService.createBooking with data and return its result', async () => {
            const bookingData = { details: 'New Booking Data' };
            const mockCreatedBooking = { id: '2', ...bookingData };
            mockCreateBooking.mockResolvedValue(mockCreatedBooking);
            const result = await bookingFacade.createBooking(bookingData);
            expect(mockCreateBooking).toHaveBeenCalledWith(bookingData);
            expect(result).toEqual(mockCreatedBooking);
        });
         it('should propagate errors from bookingService.createBooking', async () => {
            mockCreateBooking.mockRejectedValue(new Error('Service creation failed'));
            await expect(bookingFacade.createBooking({})).rejects.toThrow('Service creation failed');
        });
    });

    describe('updateBooking', () => {
        it('should call bookingService.updateBooking and return booking if found and updated', async () => {
            const bookingData = { details: 'Updated Data' };
            const mockUpdatedBooking = { id: '1', ...bookingData };
            mockUpdateBooking.mockResolvedValue(mockUpdatedBooking);
            const result = await bookingFacade.updateBooking('1', bookingData);
            expect(mockUpdateBooking).toHaveBeenCalledWith('1', bookingData);
            expect(result).toEqual(mockUpdatedBooking);
        });

        it('should return null if bookingService.updateBooking returns null', async () => {
            mockUpdateBooking.mockResolvedValue(null);
            const result = await bookingFacade.updateBooking('1', {});
            expect(result).toBeNull();
        });
         it('should propagate errors from bookingService.updateBooking', async () => {
            mockUpdateBooking.mockRejectedValue(new Error('Service update failed'));
            await expect(bookingFacade.updateBooking('1', {})).rejects.toThrow('Service update failed');
        });
    });

    describe('deleteBooking', () => {
        it('should call bookingService.deleteBooking and return its result', async () => {
            mockDeleteBooking.mockResolvedValue(true);
            const result = await bookingFacade.deleteBooking('1');
            expect(mockDeleteBooking).toHaveBeenCalledWith('1');
            expect(result).toBe(true);
        });
    });

    describe('bookRide', () => {
        const bookRideData = { userId: 'u1', rideInstanceId: 'ri1', seatsToBook: 2 };
        const mockUser = { id: 'u1', name: 'Test User' };
        const mockRideInstance = { id: 'ri1', availableSeats: 5 };

        it('should fetch user and rideInstance, then call bookingService.bookRide', async () => {
            const mockBookingResult = { id: 'b1', ...bookRideData };
            mockUserFindByPk.mockResolvedValue(mockUser); // Use the specific mock fn
            mockRideInstanceFindByPk.mockResolvedValue(mockRideInstance); // Use the specific mock fn
            mockBookRide.mockResolvedValue(mockBookingResult);

            const result = await bookingFacade.bookRide(bookRideData);

            expect(mockUserFindByPk).toHaveBeenCalledWith('u1');
            expect(mockRideInstanceFindByPk).toHaveBeenCalledWith('ri1');
            expect(mockBookRide).toHaveBeenCalledWith({
                user: mockUser,
                rideInstance: mockRideInstance,
                seatsToBook: bookRideData.seatsToBook,
            });
            expect(result).toEqual(mockBookingResult);
        });

        it('should throw error if user not found', async () => {
            mockUserFindByPk.mockResolvedValue(null);
            mockRideInstanceFindByPk.mockResolvedValue(mockRideInstance);

            await expect(bookingFacade.bookRide(bookRideData)).rejects.toThrow('User not found');
            expect(mockUserFindByPk).toHaveBeenCalledWith('u1');
            expect(mockRideInstanceFindByPk).not.toHaveBeenCalled();
            expect(mockBookRide).not.toHaveBeenCalled();
        });

        it('should have statusCode 404 on error if user not found', async () => {
            mockUserFindByPk.mockResolvedValue(null);
            mockRideInstanceFindByPk.mockResolvedValue(mockRideInstance);
            try {
                await bookingFacade.bookRide(bookRideData);
            } catch (e) {
                expect(e.statusCode).toBe(404);
            }
        });

        it('should throw error if rideInstance not found', async () => {
            mockUserFindByPk.mockResolvedValue(mockUser);
            mockRideInstanceFindByPk.mockResolvedValue(null);

            await expect(bookingFacade.bookRide(bookRideData)).rejects.toThrow('RideInstance not found');
            expect(mockUserFindByPk).toHaveBeenCalledWith('u1');
            expect(mockRideInstanceFindByPk).toHaveBeenCalledWith('ri1');
            expect(mockBookRide).not.toHaveBeenCalled();
        });

        it('should have statusCode 404 on error if rideInstance not found', async () => {
            mockUserFindByPk.mockResolvedValue(mockUser);
            mockRideInstanceFindByPk.mockResolvedValue(null);
            try {
                await bookingFacade.bookRide(bookRideData);
            } catch (e) {
                expect(e.statusCode).toBe(404);
            }
        });

        it('should re-throw error from bookingService.bookRide', async () => {
            mockUserFindByPk.mockResolvedValue(mockUser);
            mockRideInstanceFindByPk.mockResolvedValue(mockRideInstance);
            mockBookRide.mockRejectedValue(new Error('Service error'));

            await expect(bookingFacade.bookRide(bookRideData)).rejects.toThrow('Service error');
        });
    });

    describe('cancelBooking', () => {
        it('should call bookingService.cancelBooking and return booking if found', async () => {
            const mockBooking = { id: '1', status: 'cancelled' };
            mockCancelBooking.mockResolvedValue(mockBooking);
            const result = await bookingFacade.cancelBooking('1');
            expect(mockCancelBooking).toHaveBeenCalledWith('1');
            expect(result).toEqual(mockBooking);
        });

        it('should return null if bookingService.cancelBooking returns null', async () => {
            mockCancelBooking.mockResolvedValue(null);
            const result = await bookingFacade.cancelBooking('1');
            expect(result).toBeNull();
        });
         it('should propagate errors from bookingService.cancelBooking', async () => {
            mockCancelBooking.mockRejectedValue(new Error('Service cancel failed'));
            await expect(bookingFacade.cancelBooking('1')).rejects.toThrow('Service cancel failed');
        });
    });
});
