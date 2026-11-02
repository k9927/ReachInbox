import { randomBytes, randomUUID } from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { redisConnection } from "../config/redis";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

const oauthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);
const sessionCookie = "reachinbox_session";
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    path: "/"
};

function configured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.JWT_SECRET);
}

export async function startGoogleAuth(_req: Request, res: Response) {
    if (!configured()) return res.status(503).json({ success: false, message: "Google authentication is not configured" });
    const state = randomBytes(32).toString("base64url");
    await redisConnection.set(`oauth:google:state:${state}`, "1", "EX", 600, "NX");
    const url = oauthClient.generateAuthUrl({
        response_type: "code",
        scope: ["openid", "email", "profile"],
        state,
        prompt: "select_account"
    });
    return res.redirect(url);
}

export async function googleCallback(req: Request, res: Response) {
    const fail = (reason: string) => res.redirect(`${env.FRONTEND_URL}/?authError=${encodeURIComponent(reason)}`);
    if (!configured()) return res.status(503).json({ success: false, message: "Google authentication is not configured" });
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!state || !code) return fail("missing_oauth_response");

    const stateKey = `oauth:google:state:${state}`;
    const consumed = await redisConnection.eval(
        "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value or ''",
        1,
        stateKey
    );
    if (consumed !== "1") return fail("invalid_oauth_state");

    try {
        const { tokens } = await oauthClient.getToken(code);
        if (!tokens.id_token) return fail("missing_id_token");
        const ticket = await oauthClient.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
        const profile = ticket.getPayload();
        if (!profile?.sub || !profile.email || profile.email_verified !== true) return fail("unverified_google_account");
        const user = await prisma.user.upsert({
            where: { googleId: profile.sub },
            create: { googleId: profile.sub, email: profile.email.toLowerCase(), name: profile.name || profile.email, avatar: profile.picture || null },
            update: { email: profile.email.toLowerCase(), name: profile.name || profile.email, avatar: profile.picture || null }
        });
        const session = jwt.sign({ sub: user.id, jti: randomUUID() }, env.JWT_SECRET, { expiresIn: "2h", issuer: "reachinbox" });
        res.cookie(sessionCookie, session, { ...cookieOptions, maxAge: 2 * 60 * 60 * 1000 });
        return res.redirect(env.FRONTEND_URL);
    } catch (error) {
        const details = error as { name?: string; code?: string; response?: { status?: number; data?: { error?: string } } };
        console.error("Google OAuth callback failed", {
            name: details?.name || "unknown error",
            code: details?.code,
            status: details?.response?.status,
            providerError: details?.response?.data?.error
        });
        return fail("authentication_failed");
    }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return res.status(401).json({ success: false, message: "Authentication required" });
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, name: true, email: true, avatar: true, createdAt: true }
    });
    if (!user) return res.status(401).json({ success: false, message: "User no longer exists" });
    return res.json({ success: true, user });
}

export async function logout(req: Request, res: Response) {
    const session = req.cookies?.reachinbox_session;
    if (session && env.JWT_SECRET) {
        try {
            const claims = jwt.verify(session, env.JWT_SECRET, { issuer: "reachinbox" }) as jwt.JwtPayload;
            if (typeof claims.jti === "string" && typeof claims.exp === "number") {
                const ttl = Math.max(1, claims.exp - Math.floor(Date.now() / 1000));
                await redisConnection.set(`session:revoked:${claims.jti}`, "1", "EX", ttl);
            }
        } catch {
            // Clear malformed or expired cookies without turning logout into an error.
        }
    }
    res.clearCookie(sessionCookie, cookieOptions);
    return res.json({ success: true });
}
