import { emailQueue, EmailJobData } from "../queues/email.queue";
import { prisma } from "../config/database";

export async function scheduleEmail(
    data: EmailJobData,
    scheduledAt: Date
) {
    const delay = Math.max(
        0,
        scheduledAt.getTime() - Date.now()
    );

    const job = await emailQueue.add(
        "send-email",
        data,
        {
            jobId: data.emailId,
            delay
        }
    );

    return {
        jobId: job.id,
        scheduledAt
    };
}

/** Replays pending outbox entries safely after crashes or queue outages. */
export async function dispatchPendingEmails(batchSize = 250): Promise<number> {
    let totalDispatched = 0;
    // Process up to 20 batches (up to 5,000 emails) per call to handle large bursts immediately
    for (let iteration = 0; iteration < 20; iteration++) {
        const pending = await prisma.emailOutbox.findMany({
            where: { dispatchedAt: null, availableAt: { lte: new Date() } },
            include: { email: { include: { campaign: true } } },
            orderBy: { createdAt: "asc" },
            take: batchSize
        });
        if (!pending.length) break;

        for (const entry of pending) {
            try {
                const email = entry.email;
                const job = await scheduleEmail({
                    emailId: email.id, userId: email.userId, senderId: email.senderId, campaignId: email.campaignId,
                    recipient: email.recipient, subject: email.subject, body: email.body,
                    hourlyLimit: email.campaign.hourlyLimit
                }, email.scheduledAt);
                await prisma.$transaction([
                    prisma.email.update({ where: { id: email.id }, data: { jobId: String(job.jobId) } }),
                    prisma.emailOutbox.update({ where: { id: entry.id }, data: { dispatchedAt: new Date(), attempts: { increment: 1 }, lastError: null } })
                ]);
                totalDispatched++;
            } catch (error) {
                const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown queue error";
                const delay = Math.min(60_000, 1000 * 2 ** Math.min(entry.attempts, 6));
                await prisma.emailOutbox.update({
                    where: { id: entry.id },
                    data: { attempts: { increment: 1 }, lastError: message, availableAt: new Date(Date.now() + delay) }
                }).catch((updateError) => console.error("Could not update email outbox entry", updateError));
            }
        }
    }
    return totalDispatched;
}

/** Resolve stale DB claims only when BullMQ no longer owns a runnable job.
 * SMTP's outcome may be unknown, so these are failed for manual review rather
 * than resent automatically (which could duplicate a delivered message).
 */
export async function recoverStaleProcessingEmails(staleAfterMs = 15 * 60_000): Promise<number> {
    const cutoff = new Date(Date.now() - staleAfterMs);
    const stale = await prisma.email.findMany({
        where: { status: "PROCESSING", updatedAt: { lt: cutoff }, jobId: { not: null } },
        select: { id: true, jobId: true },
        take: 500
    });
    let recovered = 0;
    for (const email of stale) {
        const job = await emailQueue.getJob(email.jobId!);
        const state = job ? await job.getState() : "unknown";
        if (["waiting", "active", "delayed", "waiting-children", "prioritized", "paused"].includes(state)) continue;
        const update = await prisma.email.updateMany({
            where: { id: email.id, status: "PROCESSING", updatedAt: { lt: cutoff } },
            data: {
                status: "FAILED",
                error: "Worker stopped during delivery; SMTP outcome is unknown. Review delivery before retrying."
            }
        });
        recovered += update.count;
    }
    if (recovered) console.warn(`Marked ${recovered} stale processing emails for manual review`);
    return recovered;
}
