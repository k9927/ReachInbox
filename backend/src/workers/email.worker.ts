
import { Worker, DelayedError, UnrecoverableError } from "bullmq";

import { redisConnection } from "../config/redis";
import { prisma } from "../config/database";
import { env } from "../config/env";

import { sendEmail } from "../services/email.service";
import { reserveEmailSlot } from "../services/rateLimit.service";

import { EmailJobData } from "../queues/email.queue";
import { indexEmailDocument } from "../services/search.service";
import { notifyHourlyLimit } from "../services/slack.service";
import { decryptToken } from "../services/token-encryption.service";

export const emailWorker = new Worker<EmailJobData>(
    "email-queue",

    async (job, token) => {

        console.log(`Processing email job: ${job.id}`);

        // 1. Fetch the email from PostgreSQL
        const email = await prisma.email.findUnique({
            where: {
                id: job.data.emailId
            },
            include: {
                sender: true
            }
        });

        if (!email) {
            console.log("Email record not found:", job.data.emailId);
            return;
        }

        // 2. Prevent duplicate processing
        if (email.status === "SENT" || email.status === "FAILED") {
            console.log(
                `Skipping email ${email.id}. Status: ${email.status}`
            );
            return;
        }

        // Claim before reserving a slot so racing workers do not waste capacity.
        const claimed = await prisma.email.updateMany({
            where: { id: email.id, status: { in: ["SCHEDULED", "PROCESSING"] } },
            data: { status: "PROCESSING" }
        });
        if (claimed.count === 0) return;

        // 3. Reserve a rate-limit slot in Redis
        const reservation = await reserveEmailSlot(
            email.senderId,
            env.MAX_EMAILS_PER_HOUR,
            email.campaignId,
            job.data.hourlyLimit,
            env.MIN_EMAIL_DELAY_MS
        );

        // 4. If limit reached, move the job to a later time
        if (!reservation.allowed) {

            if (reservation.reason === "HOURLY_LIMIT" && reservation.retryAt) {
                await notifyHourlyLimit(email.userId, email.senderId, email.sender.email, reservation.retryAt);
            }

            await prisma.email.updateMany({
                where: { id: email.id, status: "PROCESSING" },
                data: { status: "SCHEDULED" }
            });

            if (!token || !reservation.retryAt) {
                throw new Error("Unable to reschedule email job");
            }

            console.log(
                `Rescheduling ${email.id}: ${reservation.reason}`
            );

            await job.moveToDelayed(
                reservation.retryAt,
                token
            );

            throw new DelayedError();
        }

        // 5. Send the email. A retry after a worker crash may see PROCESSING;
        // SMTP cannot guarantee exactly-once delivery across this boundary.
        let result;

        try {

            result = await sendEmail({
                from: email.sender.email,
                to: email.recipient,
                subject: email.subject,
                body: email.body,
                ...(email.sender.smtpHost && email.sender.smtpPort && email.sender.smtpAuthEncrypted ? {
                    smtp: {
                        host: email.sender.smtpHost,
                        port: email.sender.smtpPort,
                        secure: email.sender.smtpSecure,
                        ...JSON.parse(decryptToken(email.sender.smtpAuthEncrypted)) as { user: string; pass: string }
                    }
                } : {})
            });

        } catch (error) {

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown SMTP error";

            const responseCode = typeof error === "object" && error !== null && "responseCode" in error
                ? Number((error as { responseCode?: unknown }).responseCode)
                : undefined;
            const code = typeof error === "object" && error !== null && "code" in error
                ? String((error as { code?: unknown }).code)
                : "";
            const permanent = (responseCode !== undefined && responseCode >= 500) || ["EENVELOPE", "EINVALID", "EAUTH"].includes(code) || errorMessage.includes("Ethereal SMTP credentials are missing");
            const attemptsExhausted = job.attemptsMade + 1 >= Number(job.opts.attempts ?? 1);
            if (permanent || attemptsExhausted) {
                await prisma.email.update({ where: { id: email.id }, data: { status: "FAILED", error: errorMessage } });
                console.error(`Email ${email.id} permanently failed`);
                if (permanent) throw new UnrecoverableError(errorMessage);
                throw error;
            }
            await prisma.email.update({ where: { id: email.id }, data: { status: "SCHEDULED", error: errorMessage } });
            throw error;
        }

        // 7. Update successful delivery
        await prisma.email.update({
            where: {
                id: email.id
            },
            data: {
                status: "SENT",
                sentAt: new Date(),
                error: null
            }
        });

        try {
            await indexEmailDocument({
                id: email.id, userId: email.userId, status: "SENT", recipient: email.recipient,
                senderEmail: email.sender.email, subject: email.subject, scheduledAt: email.scheduledAt, sentAt: new Date()
            });
        } catch (error) {
            // Delivery is already complete; an indexing outage must not send the email again.
            console.error(`Could not index sent email ${email.id}`, error);
        }

        console.log(`Email sent successfully: ${email.id}`);
        console.log(`Ethereal preview: ${result.previewUrl}`);
    },

    {
        connection: redisConnection,
        concurrency: env.EMAIL_CONCURRENCY
    }
);

// Worker event listeners

emailWorker.on("completed", (job) => {
    console.log(`Job completed: ${job.id}`);
});

emailWorker.on("failed", async (job, error) => {
    console.error(
        `Job failed: ${job?.id}`,
        error.message
    );
    if (job && job.attemptsMade >= Number(job.opts.attempts ?? 1)) {
        await prisma.email.updateMany({
            where: { id: job.data.emailId, status: { in: ["SCHEDULED", "PROCESSING"] } },
            data: { status: "FAILED", error: error.message.slice(0, 1000) }
        }).catch((updateError) => console.error("Could not mark exhausted email job as failed", updateError));
    }
});

emailWorker.on("error", (error) => {
    console.error("Worker error:", error);
});

console.log(
    `Email worker started with concurrency: ${env.EMAIL_CONCURRENCY}`
);
