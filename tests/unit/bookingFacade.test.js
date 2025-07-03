import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";

// Mock all dependencies using unstable_mockModule
const mockGetAllBookings = jest.fn();
const mockGetBookingById = jest.fn();
const mockCreateBooking = jest.fn();
const mockUpdateBooking = jest.fn();
const mockDeleteBooking = jest.fn();
const mockBookRide = jest.fn();
const mockCancelBooking = jest.fn();
const mockUserFindByPk = jest.fn();
const mockRideInstanceFindByPk = jest.fn();

jest.unstable_mockModule(
    "../../src/modules/booking-module/services/bookingService.js",
    () => ({
        __esModule: true,
        default: {
            getAllBookings: mockGetAllBookings,
            getBookingById: mockGetBookingById,
            createBooking: mockCreateBooking,
            updateBooking: mockUpdateBooking,
            deleteBooking: mockDeleteBooking,
            bookRide: mockBookRide,
            cancelBooking: mockCancelBooking,
        },
    })
);
jest.unstable_mockModule(
    "../../src/modules/user-module/models/user.js",
    () => ({
        __esModule: true,
        default: { findByPk: mockUserFindByPk },
    })
);
jest.unstable_mockModule(
    "../../src/modules/ride-module/models/rideInstance.js",
    () => ({
        __esModule: true,
        default: { findByPk: mockRideInstanceFindByPk },
    })
);

let bookingFacade;
beforeAll(async () => {
    bookingFacade = (
        await import(
            "../../src/modules/booking-module/facades/bookingFacade.js"
        )
    ).default;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe("bookingFacade", () => {
    it("getAllBookings returns bookings from service", async () => {
        const bookings = [{ id: 1 }];
        mockGetAllBookings.mockResolvedValue(bookings);
        const result = await bookingFacade.getAllBookings();
        expect(mockGetAllBookings).toHaveBeenCalled();
        expect(result).toBe(bookings);
    });

    it("getBookingById returns booking if found", async () => {
        const booking = { id: 2 };
        mockGetBookingById.mockResolvedValue(booking);
        const result = await bookingFacade.getBookingById(2);
        expect(mockGetBookingById).toHaveBeenCalledWith(2);
        expect(result).toBe(booking);
    });

    it("getBookingById returns null if not found", async () => {
        mockGetBookingById.mockResolvedValue(null);
        const result = await bookingFacade.getBookingById(99);
        expect(result).toBeNull();
    });

    it("createBooking returns created booking", async () => {
        const bookingData = { rideInstanceId: 1, seatsBooked: 2 };
        const created = { id: 3, ...bookingData };
        mockCreateBooking.mockResolvedValue(created);
        const result = await bookingFacade.createBooking(bookingData);
        expect(mockCreateBooking).toHaveBeenCalledWith(bookingData);
        expect(result).toBe(created);
    });

    it("updateBooking returns updated booking", async () => {
        const bookingData = { seatsBooked: 3 };
        const updated = { id: 4, ...bookingData };
        mockUpdateBooking.mockResolvedValue(updated);
        const result = await bookingFacade.updateBooking(4, bookingData);
        expect(mockUpdateBooking).toHaveBeenCalledWith(4, bookingData);
        expect(result).toBe(updated);
    });

    it("updateBooking returns null if not found", async () => {
        mockUpdateBooking.mockResolvedValue(null);
        const result = await bookingFacade.updateBooking(5, {});
        expect(result).toBeNull();
    });

    it("deleteBooking returns true if deleted", async () => {
        mockDeleteBooking.mockResolvedValue(true);
        const result = await bookingFacade.deleteBooking(6);
        expect(mockDeleteBooking).toHaveBeenCalledWith(6);
        expect(result).toBe(true);
    });

    it("bookRide returns booking if user and rideInstance found", async () => {
        const data = { userId: 1, rideInstanceId: 2, seatsToBook: 1 };
        const user = { id: 1 };
        const rideInstance = { id: 2 };
        const booking = { id: 7 };
        mockUserFindByPk.mockResolvedValue(user);
        mockRideInstanceFindByPk.mockResolvedValue(rideInstance);
        mockBookRide.mockResolvedValue(booking);
        const result = await bookingFacade.bookRide(data);
        expect(mockUserFindByPk).toHaveBeenCalledWith(1);
        expect(mockRideInstanceFindByPk).toHaveBeenCalledWith(2);
        expect(mockBookRide).toHaveBeenCalledWith({
            user,
            rideInstance,
            seatsToBook: 1,
        });
        expect(result).toBe(booking);
    });

    it("bookRide throws error if user not found", async () => {
        mockUserFindByPk.mockResolvedValue(null);
        await expect(
            bookingFacade.bookRide({
                userId: 1,
                rideInstanceId: 2,
                seatsToBook: 1,
            })
        ).rejects.toThrow("User not found");
    });

    it("bookRide throws error if rideInstance not found", async () => {
        mockUserFindByPk.mockResolvedValue({ id: 1 });
        mockRideInstanceFindByPk.mockResolvedValue(null);
        await expect(
            bookingFacade.bookRide({
                userId: 1,
                rideInstanceId: 2,
                seatsToBook: 1,
            })
        ).rejects.toThrow("RideInstance not found");
    });

    it("cancelBooking returns cancelled booking", async () => {
        const cancelled = { id: 8, status: "cancelled" };
        mockCancelBooking.mockResolvedValue(cancelled);
        const result = await bookingFacade.cancelBooking(8);
        expect(mockCancelBooking).toHaveBeenCalledWith(8);
        expect(result).toBe(cancelled);
    });

    it("cancelBooking returns null if not found", async () => {
        mockCancelBooking.mockResolvedValue(null);
        const result = await bookingFacade.cancelBooking(9);
        expect(result).toBeNull();
    });
});
