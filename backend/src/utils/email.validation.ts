
import { z } from "zod";

export const scheduleEmailSchema = z.object({
    senderId: z.string().uuid(),

    subject: z.string().min(1).max(500),

    body: z.string().min(1),

    recipients: z.array(
        z.string().email()
    ).min(1).max(5000),

    startAt: z.string().datetime({ offset: true }),

    delayMs: z.number().int().min(2000).max(3600000),

    hourlyLimit: z.number().int().min(1).max(10000)
}).refine(
    (data) => new Set(data.recipients).size === data.recipients.length,
    {
        message: "Duplicate email addresses are not allowed",
        path: ["recipients"]
    }
);

export type ScheduleEmailInput = z.infer<
    typeof scheduleEmailSchema
>;
