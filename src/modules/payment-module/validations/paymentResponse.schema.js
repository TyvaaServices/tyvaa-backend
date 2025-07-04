import { z } from "zod";

export const paymentResponseSchema = z.object({
    transaction_id: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z
        .enum(["ACCEPTED", "FAILED", "PENDING", "CANCELLED", "SUCCESS"])
        .or(z.string()),
    payment_method: z.string(),
    description: z.string(),
    metadata: z.string(),
    operator_id: z.string(),
    payment_date: z.string().datetime(),
});
