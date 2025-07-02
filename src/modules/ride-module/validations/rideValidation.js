import { z } from 'zod';

export const createRideSchema = z.object({
  body: z.object({
    driverId: z.string(),
    origin: z.string(),
    destination: z.string(),
    departureTime: z.string(),
    availableSeats: z.number().int().positive(),
  }),
});

export const updateRideSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    origin: z.string().optional(),
    destination: z.string().optional(),
    departureTime: z.string().optional(),
    availableSeats: z.number().int().positive().optional(),
  }),
});

export const createRideInstanceSchema = z.object({
  body: z.object({
    rideId: z.string(),
    departureTime: z.string(),
  }),
});

export const updateRideInstanceSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    departureTime: z.string().optional(),
    status: z.enum(['scheduled', 'departed', 'completed', 'cancelled']).optional(),
  }),
});
