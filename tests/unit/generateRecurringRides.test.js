import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";

const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

jest.unstable_mockModule("../../src/config/index.js", () => ({
    RideModel: { findAll: mockFindAll },
    RideInstance: { findOne: mockFindOne, create: mockCreate },
}));
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
    default: () => mockLogger,
}));

let generateRecurringRides;
beforeAll(async () => {
    const mod = await import(
        "../../src/modules/ride-module/cron/generateRecurringRides.js"
    );
    generateRecurringRides = mod.default;
});

describe("generateRecurringRides", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("creates ride instances for valid recurring rides", async () => {
        const ride = {
            id: 1,
            isRecurring: true,
            status: "active",
            recurrence: ["Monday"],
            time: "10:00:00",
            seatsAvailable: 3,
        };
        mockFindAll.mockResolvedValueOnce([ride]);

        const today = new Date();
        today.setDate(today.getDate() - today.getDay());
        const monday = new Date(today);
        monday.setDate(today.getDate() + 1);
        jest.spyOn(global, "Date").mockImplementation(() => monday);
        mockFindOne.mockResolvedValueOnce(null);
        mockCreate.mockResolvedValueOnce({});

        await generateRecurringRides();
        expect(mockFindAll).toHaveBeenCalled();
        expect(mockFindOne).toHaveBeenCalled();
        expect(mockCreate).toHaveBeenCalled();
        jest.spyOn(global, "Date").mockRestore();
    });

    it.each([
        { scenario: "null recurrence", recurrence: null, rideId: 2 },
        { scenario: "empty recurrence array", recurrence: [], rideId: 3 },
    ])("skips rides with $scenario", async ({ recurrence, rideId }) => {
        const ride = {
            id: rideId,
            isRecurring: true,
            status: "active",
            recurrence,
            time: "10:00:00",
        };
        mockFindAll.mockResolvedValueOnce([ride]);
        await generateRecurringRides();

        expect(mockLogger.warn).toHaveBeenCalledWith(
            `Skipping RideModel ID ${rideId}: Invalid or empty recurrence array.`
        );
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("warns and defaults to midnight if rideModel.time is missing", async () => {
        const ride = {
            id: 4,
            isRecurring: true,
            status: "active",
            recurrence: ["Tuesday"],
            time: undefined,
            seatsAvailable: 5,
        };
        mockFindAll.mockResolvedValueOnce([ride]);

        const today = new Date();
        const currentDay = today.getDay();
        const daysUntilTuesday = (2 - currentDay + 7) % 7;
        const tuesday = new Date(today);
        tuesday.setDate(today.getDate() + daysUntilTuesday);
        tuesday.setHours(0, 0, 0, 0);

        const OriginalDate = global.Date;
        global.Date = jest.fn((...args) => {
            if (args.length === 0) return tuesday;
            return new OriginalDate(...args);
        });

        mockFindOne.mockResolvedValue(null);
        mockCreate.mockResolvedValue({});

        await generateRecurringRides();

        expect(mockLogger.warn).toHaveBeenCalledWith(
            `RideModel ID ${ride.id} has no departure time specified. Defaulting to midnight for instance generation on ${tuesday.toISOString().split("T")[0]}.`
        );

        expect(mockCreate).toHaveBeenCalledTimes(
            RIDE_INSTANCE_GENERATION_LOOKAHEAD_DAYS + 1 >= daysUntilTuesday + 7
                ? 3
                : RIDE_INSTANCE_GENERATION_LOOKAHEAD_DAYS + 1 >=
                    daysUntilTuesday
                  ? 2
                  : RIDE_INSTANCE_GENERATION_LOOKAHEAD_DAYS + 1 >=
                      daysUntilTuesday - 7
                    ? 1
                    : 0
        );
        if (mockCreate.mock.calls.length > 0) {
            expect(mockCreate.mock.calls[0][0]).toEqual(
                expect.objectContaining({
                    rideId: ride.id,
                    rideDate: expect.any(OriginalDate),
                })
            );
            const createdDateArg = mockCreate.mock.calls[0][0].rideDate;
            expect(createdDateArg.getFullYear()).toBe(tuesday.getFullYear());
            expect(createdDateArg.getMonth()).toBe(tuesday.getMonth());
            expect(createdDateArg.getDate()).toBe(tuesday.getDate());
            expect(createdDateArg.getHours()).toBe(0);
            expect(createdDateArg.getMinutes()).toBe(0);
            expect(createdDateArg.getSeconds()).toBe(0);
        } else {
            throw new Error(
                "mockCreate was not called, check test setup for date mocking and lookahead logic."
            );
        }
        global.Date = OriginalDate;
    });

    it("logs error if RideInstance.create fails but continues processing", async () => {
        const ride1 = {
            id: 5,
            isRecurring: true,
            status: "active",
            recurrence: ["Wednesday"],
            time: "12:00:00",
            seatsAvailable: 2,
        };
        const ride2 = {
            id: 6,
            isRecurring: true,
            status: "active",
            recurrence: ["Wednesday"],
            time: "14:00:00",
            seatsAvailable: 4,
        };
        mockFindAll.mockResolvedValueOnce([ride1, ride2]);

        const OriginalDate = global.Date;
        const today = new OriginalDate();
        const currentDay = today.getDay();
        const daysUntilWednesday = (3 - currentDay + 7) % 7;
        const wednesday = new OriginalDate(today);
        wednesday.setDate(today.getDate() + daysUntilWednesday);
        wednesday.setHours(0, 0, 0, 0);

        global.Date = jest.fn((...args) => {
            if (args.length === 0) return wednesday;
            return new OriginalDate(...args);
        });

        mockFindOne.mockResolvedValue(null);
        const creationError = new Error("DB creation failed");
        mockCreate
            .mockImplementationOnce(async () => {
                throw creationError;
            })
            .mockResolvedValue({});
        await generateRecurringRides();

        let expectedCreateCalls = 0;
        for (let i = 0; i <= RIDE_INSTANCE_GENERATION_LOOKAHEAD_DAYS; i++) {
            const date = new OriginalDate(wednesday);
            date.setDate(wednesday.getDate() + i);
            if (date.getDay() === 3) {
                expectedCreateCalls += 2;
            }
        }
        expect(mockCreate.mock.calls.length).toBeGreaterThanOrEqual(2);

        const wednesdayAt12 = new OriginalDate(wednesday);
        wednesdayAt12.setHours(12, 0, 0, 0);
        expect(mockLogger.error).toHaveBeenCalledWith(
            `Failed to create RideInstance for RideModel ID ${ride1.id} on ${wednesdayAt12.toISOString()}:`,
            creationError
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
            "Recurring ride instance generation job finished successfully."
        );

        global.Date = OriginalDate;
    });

    const RIDE_INSTANCE_GENERATION_LOOKAHEAD_DAYS = parseInt(
        process.env.RIDE_LOOKAHEAD_DAYS || "14",
        10
    );

    it("skips creating instance if it already exists", async () => {
        const ride = {
            id: 7,
            isRecurring: true,
            status: "active",
            recurrence: ["Thursday"],
            time: "08:00:00",
            seatsAvailable: 1,
        };
        mockFindAll.mockResolvedValueOnce([ride]);

        const OriginalDate = global.Date;
        const today = new OriginalDate();
        const currentDay = today.getDay();
        const daysUntilThursday = (4 - currentDay + 7) % 7;
        const thursday = new OriginalDate(today);
        thursday.setDate(today.getDate() + daysUntilThursday);
        thursday.setHours(0, 0, 0, 0);

        global.Date = jest.fn((...args) => {
            if (args.length === 0) return thursday;
            return new OriginalDate(...args);
        });

        mockFindOne.mockResolvedValue({ id: 100, rideId: 7 });

        await generateRecurringRides();

        expect(mockFindOne).toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();

        const thursdayAt8 = new OriginalDate(thursday);
        thursdayAt8.setHours(8, 0, 0, 0);
        expect(mockLogger.debug).toHaveBeenCalledWith(
            `RideInstance already exists for RideModel ID ${ride.id} on ${thursdayAt8.toISOString()}. Skipping creation.`
        );
        global.Date = OriginalDate;
    });

    it("logs and throws on error during DB fetch (getActiveRecurringRideModels)", async () => {
        mockFindAll.mockRejectedValueOnce(new Error("db fail"));
        await expect(generateRecurringRides()).rejects.toThrow("db fail");
        expect(mockLogger.error).toHaveBeenCalledWith(
            "Critical error during recurring ride instance generation job:",
            expect.any(Error)
        );
    });

    it("logs and throws on error during getUpcomingDatesForInstanceGeneration", async () => {
        const ride = {
            id: 8,
            isRecurring: true,
            status: "active",
            recurrence: ["Friday"],
            time: "10:00:00",
            seatsAvailable: 1,
        };
        mockFindAll.mockResolvedValueOnce([ride]);

        const OriginalDate = global.Date;
        const dateError = new Error("Date creation failed in loop");
        let callCount = 0;
        global.Date = jest.fn((...args) => {
            callCount++;
            if (callCount > 1 && args.length > 0) {
                throw dateError;
            }
            if (args.length === 0 && callCount === 1) {
                return new OriginalDate();
            }
            return new OriginalDate(...args);
        });

        await expect(generateRecurringRides()).rejects.toThrow(dateError);
        expect(mockLogger.error).toHaveBeenCalledWith(
            "Critical error during recurring ride instance generation job:",
            dateError
        );
        global.Date = OriginalDate;
    });

    it("logs info and exits if no active recurring ride models are found", async () => {
        mockFindAll.mockResolvedValueOnce([]);

        await generateRecurringRides();

        expect(mockLogger.info).toHaveBeenCalledWith(
            "No active recurring ride models found. Exiting job."
        );
        expect(mockCreate).not.toHaveBeenCalled();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });
});
