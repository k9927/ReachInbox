import { WebClient } from "@slack/web-api";
import { redisConnection } from "../config/redis";
import { prisma } from "../config/database";
import { decryptToken } from "./token-encryption.service";

export async function notifyHourlyLimit(userId: string, senderId: string, senderEmail: string, retryAt: number) {
    const hour = Math.floor(retryAt / 3_600_000);
    const key = `slack:rate-limit-notice:${senderId}:${hour}`;
    const claimed = await redisConnection.set(key, "1", "EX", 7200, "NX");
    if (claimed !== "OK") return;

    try {
        const account = await prisma.slackAccount.findUnique({ where: { userId } });
        if (!account?.channelId) {
            await redisConnection.del(key);
            return;
        }
        const client = new WebClient(decryptToken(account.accessToken));
        await client.chat.postMessage({
            channel: account.channelId,
            text: `ReachInbox paused sending from ${senderEmail} after reaching its hourly limit. Sending will resume around ${new Date(retryAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}.`
        });
    } catch (error) {
        await redisConnection.del(key).catch(() => undefined);
        console.error("Slack rate-limit notification failed", error instanceof Error ? error.name : "unknown error");
    }
}
