import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { redisConnection } from "../config/redis";

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

/** Verifies a signed bearer token. OAuth will be the only token issuer. */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!env.JWT_SECRET) {
        return res.status(503).json({ success: false, message: "Authentication is not configured" });
    }

    const authorization = req.header("authorization");
    const token = req.cookies?.reachinbox_session ?? (authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined);
    if (!token) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
        const claims = jwt.verify(token, env.JWT_SECRET, { issuer: "reachinbox" }) as jwt.JwtPayload;
        if (typeof claims.sub !== "string" || typeof claims.jti !== "string") {
            return res.status(401).json({ success: false, message: "Invalid authentication token" });
        }
        if (await redisConnection.get(`session:revoked:${claims.jti}`)) {
            return res.status(401).json({ success: false, message: "Session has ended" });
        }
        req.userId = claims.sub;
        return next();
    } catch (error) {
        if (!(error instanceof jwt.JsonWebTokenError) && !(error instanceof jwt.TokenExpiredError) && !(error instanceof jwt.NotBeforeError)) {
            return res.status(503).json({ success: false, message: "Session validation is temporarily unavailable" });
        }
        return res.status(401).json({ success: false, message: "Invalid or expired authentication token" });
    }
}
