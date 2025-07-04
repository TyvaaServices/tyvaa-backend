import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGetAllBookings = jest.fn();
const mockGetBookingById = jest.fn();
const mockCreateBooking = jest.fn();
const mockUpdateBooking = jest.fn();
const mockDeleteBooking = jest.fn();
const mockBookRide = jest.fn();
const mockCancelBooking = jest.fn();

jest.unstable_mockModule(
    "../../src/modules/booking-module/facades/bookingFacade.js",
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

describe("Booking Controller (with Facade)", () => {
    let mockRequest;
    let mockReply;
    let bookingController;

    beforeEach(async () => {
        jest.resetModules();
        mockRequest = {
            params: {},
            body: {},
        };
        mockReply = {
            send: jest.fn().mockReturnThis(),
            code: jest.fn().mockReturnThis(),
        };
        mockGetAllBookings.mockClear();
        mockGetBookingById.mockClear();
        mockCreateBooking.mockClear();
        mockUpdateBooking.mockClear();
        mockDeleteBooking.mockClear();
        mockBookRide.mockClear();
        mockCancelBooking.mockClear();
        bookingController = (
            await import(
                "../../src/modules/booking-module/controllers/bookingController.js"
            )
        ).default;
    });

    describe("getAllBookings", () => {
        it("should call facade.getAllBookings and return bookings", async () => {
            const bookings = [{ id: 1, name: "Booking 1" }];
            mockGetAllBookings.mockResolvedValue(bookings);
            await bookingController.getAllBookings(mockRequest, mockReply);
            expect(mockGetAllBookings).toHaveBeenCalled();
            expect(mockReply.send).toHaveBeenCalledWith(bookings);
        });
    });

    describe("getBookingById", () => {
        it("should call facade.getBookingById and return booking if found", async () => {
            const booking = { id: 1, name: "Test Booking" };
            mockRequest.params.id = 1;
            mockGetBookingById.mockResolvedValue(booking);
            await bookingController.getBookingById(mockRequest, mockReply);
            expect(mockGetBookingById).toHaveBeenCalledWith(1);
            expect(mockReply.send).toHaveBeenCalledWith(booking);
        });

        it("should return 404 if facade.getBookingById returns null", async () => {
            mockRequest.params.id = 1;
            mockGetBookingById.mockResolvedValue(null);
            await bookingController.getBookingById(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Booking not found",
            });
        });
    });

    describe("updateBooking", () => {
        it("should call facade.updateBooking and return booking", async () => {
            const bookingUpdateData = { name: "Updated Booking" };
            const updatedBooking = { id: 1, ...bookingUpdateData };
            mockRequest.params.id = 1;
            mockRequest.body = bookingUpdateData;
            mockUpdateBooking.mockResolvedValue(updatedBooking);
            await bookingController.updateBooking(mockRequest, mockReply);
            expect(mockUpdateBooking).toHaveBeenCalledWith(
                1,
                bookingUpdateData
            );
            expect(mockReply.send).toHaveBeenCalledWith(updatedBooking);
        });

        it("should return 404 if facade.updateBooking returns null", async () => {
            mockRequest.params.id = 1;
            mockUpdateBooking.mockResolvedValue(null);
            await bookingController.updateBooking(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Booking not found",
            });
        });

        it("should handle errors from facade.updateBooking", async () => {
            mockRequest.params.id = 1;
            mockUpdateBooking.mockRejectedValue(new Error("Update failed"));
            await bookingController.updateBooking(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Update failed",
            });
        });
    });

    describe("deleteBooking", () => {
        it("should call facade.deleteBooking and return 204 if successful", async () => {
            mockRequest.params.id = 1;
            mockDeleteBooking.mockResolvedValue(true);
            await bookingController.deleteBooking(mockRequest, mockReply);
            expect(mockDeleteBooking).toHaveBeenCalledWith(1);
            expect(mockReply.code).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalled();
        });

        it("should return 404 if facade.deleteBooking returns false", async () => {
            mockRequest.params.id = 1;
            mockDeleteBooking.mockResolvedValue(false);
            await bookingController.deleteBooking(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Booking not found or could not be deleted",
            });
        });
    });

    describe("bookRide", () => {
        const rideData = { userId: 1, rideInstanceId: 10, seatsToBook: 2 };
        it("should call facade.bookRide and return 201 with booking", async () => {
            const bookingResult = { id: 100, ...rideData };
            mockRequest.body = rideData;
            mockBookRide.mockResolvedValue(bookingResult);
            await bookingController.bookRide(mockRequest, mockReply);
            expect(mockBookRide).toHaveBeenCalledWith(rideData);
            expect(mockReply.code).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith(bookingResult);
        });

        it("should return 400 if facade.bookRide throws error without statusCode", async () => {
            mockRequest.body = rideData;
            mockBookRide.mockRejectedValue(new Error("Booking ride failed"));
            await bookingController.bookRide(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Booking ride failed",
            });
        });

        it("should return specific statusCode if facade.bookRide throws error with statusCode", async () => {
            mockRequest.body = rideData;
            const facadeError = new Error("User not found by facade");
            facadeError.statusCode = 404;
            mockBookRide.mockRejectedValue(facadeError);
            await bookingController.bookRide(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "User not found by facade",
            });
        });
    });

    describe("cancelBooking", () => {
        it("should call facade.cancelBooking and return message and booking", async () => {
            const bookingId = "booking123";
            const cancelledBooking = { id: bookingId, status: "cancelled" };
            mockRequest.params.bookingId = bookingId;
            mockCancelBooking.mockResolvedValue(cancelledBooking);
            await bookingController.cancelBooking(mockRequest, mockReply);
            expect(mockCancelBooking).toHaveBeenCalledWith(bookingId);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Booking cancelled successfully.",
                booking: cancelledBooking,
            });
        });

        it("should return 404 if facade.cancelBooking returns null", async () => {
            mockRequest.params.bookingId = "booking123";
            mockCancelBooking.mockResolvedValue(null);
            await bookingController.cancelBooking(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Booking not found or already cancelled",
            });
        });

        it("should return 400 if facade.cancelBooking throws error", async () => {
            mockRequest.params.bookingId = "booking123";
            mockCancelBooking.mockRejectedValue(
                new Error("Cancellation via facade failed")
            );
            await bookingController.cancelBooking(mockRequest, mockReply);
            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Cancellation via facade failed",
            });
        });
    });
});
