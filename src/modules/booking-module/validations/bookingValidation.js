import { z } from "zod";

export const createBookingSchema = z.object({
    body: z.object({
        rideInstanceId: z.string(),
        seatsBooked: z.number().int().positive(),
    }),
});

export const updateBookingSchema = z.object({
    params: z.object({
        id: z.string(),
    }),
    body: z.object({
        seatsBooked: z.number().int().positive().optional(),
        status: z.enum(["booked", "cancelled"]).optional(),
    }),
});
