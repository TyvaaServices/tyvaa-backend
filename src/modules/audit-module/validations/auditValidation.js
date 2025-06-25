import { z } from "zod";

export const auditLogSchema = z
    .object({
        entityId: z.number().optional(),
        entityType: z.string().min(1),
        description: z.string().min(1),
        actionTypeId: z.number(),
        ipAddress: z.string().optional(),
    })
    .strict();

export function validateAuditLog(log) {
    const parsed = auditLogSchema.safeParse(log);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error.errors));
    return parsed.data;
}
