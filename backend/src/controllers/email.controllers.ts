import { createHash } from "crypto";
import { Response } from "express";
import { Prisma } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { scheduleEmailSchema } from "../utils/email.validation";
import { indexEmailDocument } from "../services/search.service";
import { dispatchPendingEmails } from "../services/scheduler.service";

export async function scheduleEmails(req: AuthenticatedRequest, res: Response) {
    const parsed = scheduleEmailSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ success: false, message: "Invalid request data", errors: parsed.error.flatten() });
    }
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const idempotencyKey = req.header("Idempotency-Key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
        return res.status(400).json({ success: false, message: "A valid Idempotency-Key header is required" });
    }

    const data = parsed.data;
    const recipients = [...new Set(data.recipients.map((email) => email.trim().toLowerCase()))];
    const startAt = new Date(data.startAt);
    const requestHash = createHash("sha256").update(JSON.stringify({
        senderId: data.senderId, subject: data.subject, body: data.body, recipients,
        startAt: startAt.toISOString(), delayMs: data.delayMs, hourlyLimit: data.hourlyLimit
    })).digest("hex");
    if (startAt.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: "Start time must be in the future" });
    }

    const sender = await prisma.sender.findFirst({ where: { id: data.senderId, userId } });
    if (!sender) return res.status(404).json({ success: false, message: "Sender not found" });

    const existing = await prisma.campaign.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
        include: { _count: { select: { emails: true } } }
    });
    if (existing) {
        if (existing.requestHash !== requestHash) {
            return res.status(409).json({ success: false, message: "Idempotency-Key was already used for a different request" });
        }
        return res.status(200).json({ success: true, message: "Campaign already created", campaignId: existing.id, totalEmails: existing._count.emails });
    }

    const delayMs = Math.max(data.delayMs, env.MIN_EMAIL_DELAY_MS);
    try {
        const result = await prisma.$transaction(async (tx) => {
            const created = await tx.campaign.create({
                data: {
                    userId, senderId: sender.id, subject: data.subject, body: data.body,
                    startAt, delayMs, hourlyLimit: data.hourlyLimit, idempotencyKey, requestHash
                }
            });
            const emails = await tx.email.createManyAndReturn({
                data: recipients.map((recipient, index) => ({
                    userId, senderId: sender.id, campaignId: created.id, recipient,
                    subject: data.subject, body: data.body,
                    scheduledAt: new Date(startAt.getTime() + index * delayMs),
                    idempotencyKey: `${created.id}:${index}`
                }))
            });
            await tx.emailOutbox.createMany({
                data: emails.map((email) => ({ emailId: email.id, campaignId: created.id }))
            });
            return { campaign: created, emails };
        });

        // Trigger immediate dispatch to BullMQ delayed queue
        void dispatchPendingEmails().catch((err) => console.error("Initial email dispatch error", err));

        const indexing = await Promise.allSettled(result.emails.map((email) => indexEmailDocument({
            id: email.id, userId, status: email.status, recipient: email.recipient,
            senderEmail: sender.email, subject: email.subject, scheduledAt: email.scheduledAt, sentAt: email.sentAt
        })));
        if (indexing.some((entry) => entry.status === "rejected")) console.error("One or more emails could not be indexed; configure/recover Elasticsearch and reindex.");
        return res.status(201).json({ success: true, message: "Email campaign created", campaignId: result.campaign.id, totalEmails: recipients.length });
    } catch (error) {
        // Concurrent repeats can race the initial lookup; the unique key makes the winner authoritative.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const raced = await prisma.campaign.findUnique({
                where: { userId_idempotencyKey: { userId, idempotencyKey } },
                include: { _count: { select: { emails: true } } }
            });
            if (raced?.requestHash === requestHash) {
                return res.status(200).json({ success: true, message: "Campaign already created", campaignId: raced.id, totalEmails: raced._count.emails });
            }
            if (raced) return res.status(409).json({ success: false, message: "Idempotency-Key was already used for a different request" });
        }
        console.error("Failed to create email campaign", error instanceof Error ? error.name : "unknown error");
        return res.status(500).json({ success: false, message: "Unable to create email campaign" });
    }
}
