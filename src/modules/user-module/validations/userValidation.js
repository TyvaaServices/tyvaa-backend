import { z } from "zod";

export const createUserSchema = z.object({
    body: z.object({
        phoneNumber: z.string().min(10).max(15),
        fullName: z.string().min(2).max(50),
        email: z.string().email().optional(),
        sexe: z.enum(["male", "female"]),
        dateOfBirth: z.string().optional(),
        appLanguage: z.string().optional(),
        otp: z.string().length(6),
    }),
});

export const updateUserSchema = z.object({
    params: z.object({
        id: z.string(),
    }),
    body: z.object({
        fullName: z.string().min(2).max(50).optional(),
        email: z.string().email().optional(),
        sexe: z.enum(["male", "female"]).optional(),
        dateOfBirth: z.string().optional(),
        appLanguage: z.string().optional(),
    }),
});

export const loginSchema = z.object({
    body: z
        .object({
            phoneNumber: z.string().min(10).max(15).optional(),
            email: z.string().email().optional(),
            otp: z.string().length(6),
        })
        .refine((data) => data.phoneNumber || data.email, {
            message: "Either phone number or email must be provided",
        }),
});

export const requestOtpSchema = z.object({
    body: z
        .object({
            phoneNumber: z.string().min(10).max(15).optional(),
            email: z.string().email().optional(),
        })
        .refine((data) => data.phoneNumber || data.email, {
            message: "Either phone number or email must be provided",
        }),
});

export const updateFcmTokenSchema = z.object({
    body: z.object({
        fcmToken: z.string(),
    }),
});

export const updateLocationSchema = z.object({
    body: z.object({
        latitude: z.number(),
        longitude: z.number(),
    }),
});

export const submitDriverApplicationSchema = z.object({
    body: z.object({
        licenseNumber: z.string(),
        vehicleModel: z.string(),
        vehicleYear: z.number(),
    }),
});

export const reviewDriverApplicationSchema = z.object({
    params: z.object({
        id: z.string(),
    }),
    body: z.object({
        status: z.enum(["approved", "rejected"]),
        comments: z.string().optional(),
    }),
});
