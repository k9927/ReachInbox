import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { WebClient } from "@slack/web-api";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { redisConnection } from "../config/redis";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { encryptToken, decryptToken } from "../services/token-encryption.service";

const configured = () => Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY);

export async function startSlackOAuth(req: AuthenticatedRequest, res: Response) {
    if (!configured()) return res.status(503).json({ success: false, message: "Slack integration is not configured" });
    if (!req.userId) return res.status(401).json({ success: false, message: "Authentication required" });
    const state = randomBytes(32).toString("base64url");
    await redisConnection.set(`oauth:slack:state:${state}`, req.userId, "EX", 600, "NX");
    const params = new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        scope: "chat:write,channels:read,groups:read,im:read,mpim:read",
        redirect_uri: env.SLACK_CALLBACK_URL,
        state
    });
    return res.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
}

export async function slackCallback(req: Request, res: Response) {
    const done = (status: string) => res.redirect(`${env.FRONTEND_URL}/?slack=${encodeURIComponent(status)}`);
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!configured() || !state || !code) return done("failed");
    const key = `oauth:slack:state:${state}`;
    const userId = await redisConnection.eval(
        "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value or ''",
        1, key
    );
    if (typeof userId !== "string" || !userId) return done("invalid_state");
    try {
        const response = await new WebClient().oauth.v2.access({
            client_id: env.SLACK_CLIENT_ID,
            client_secret: env.SLACK_CLIENT_SECRET,
            code,
            redirect_uri: env.SLACK_CALLBACK_URL
        });
        if (!response.ok || !response.access_token || !response.team?.id) return done("failed");
        const defaultChannelId = (response as { incoming_webhook?: { channel_id?: string } }).incoming_webhook?.channel_id || null;
        await prisma.slackAccount.upsert({
            where: { userId },
            create: {
                userId,
                accessToken: encryptToken(response.access_token),
                teamId: response.team.id,
                teamName: response.team.name || null,
                channelId: defaultChannelId
            },
            update: {
                accessToken: encryptToken(response.access_token),
                teamId: response.team.id,
                teamName: response.team.name || null,
                channelId: defaultChannelId
            }
        });
        return done("connected");
    } catch (error) {
        console.error("Slack OAuth callback failed", error instanceof Error ? error.name : "unknown error");
        return done("failed");
    }
}

export async function getSlackStatus(req: AuthenticatedRequest, res: Response) {
    const account = await prisma.slackAccount.findUnique({
        where: { userId: req.userId! },
        select: { teamId: true, teamName: true, channelId: true, createdAt: true }
    });
    return res.json({ success: true, connected: Boolean(account), account });
}

export async function listSlackChannels(req: AuthenticatedRequest, res: Response) {
    const account = await prisma.slackAccount.findUnique({ where: { userId: req.userId! } });
    if (!account) return res.status(404).json({ success: false, message: "Connect Slack first" });
    try {
        const client = new WebClient(decryptToken(account.accessToken));
        const result = await client.conversations.list({
            types: "public_channel,private_channel",
            exclude_archived: true,
            limit: 100
        });
        const channels = (result.channels || []).map((ch) => ({
            id: ch.id,
            name: ch.name || ch.id,
            isPrivate: Boolean(ch.is_private)
        }));
        return res.json({ success: true, channels });
    } catch (error) {
        console.error("Failed to list Slack channels", error instanceof Error ? error.message : "unknown error");
        return res.json({ success: true, channels: [] });
    }
}

export async function setSlackChannel(req: AuthenticatedRequest, res: Response) {
    const parsed = z.object({ channelId: z.string().regex(/^[CGD][A-Z0-9]+$/) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Provide a valid Slack channel ID" });
    const account = await prisma.slackAccount.findUnique({ where: { userId: req.userId! } });
    if (!account) return res.status(404).json({ success: false, message: "Connect Slack first" });
    try {
        const client = new WebClient(decryptToken(account.accessToken));
        const result = await client.conversations.info({ channel: parsed.data.channelId });
        if (!result.ok || !result.channel) return res.status(400).json({ success: false, message: "Slack could not find that channel" });
        const updated = await prisma.slackAccount.update({
            where: { userId: req.userId! },
            data: { channelId: parsed.data.channelId },
            select: { teamName: true, channelId: true }
        });
        return res.json({ success: true, account: updated });
    } catch (error) {
        console.error("Slack channel validation failed", error instanceof Error ? error.name : "unknown error");
        return res.status(400).json({ success: false, message: "Unable to verify channel; confirm the bot can access it" });
    }
}

export async function disconnectSlack(req: AuthenticatedRequest, res: Response) {
    const account = await prisma.slackAccount.findUnique({ where: { userId: req.userId! } });
    if (account) {
        try {
            await new WebClient(decryptToken(account.accessToken)).auth.revoke();
        } catch (error) {
            console.error("Could not revoke Slack token during disconnect", error instanceof Error ? error.name : "unknown error");
        }
    }
    await prisma.slackAccount.deleteMany({ where: { userId: req.userId! } });
    return res.json({ success: true });
}
