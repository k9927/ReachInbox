
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export interface EmailJobData {
    emailId: string;
    userId: string;
    senderId: string;
    campaignId: string;
    recipient: string;
    subject: string;
    body: string;
    hourlyLimit: number;
}

export const emailQueue = new Queue<EmailJobData>(
    "email-queue",
    {
        connection: redisConnection,
        defaultJobOptions: {
            attempts: 3,

            backoff: {
                type: "exponential",
                delay: 5000
            },

            removeOnComplete: false,
            removeOnFail: false
        }
    }
);
