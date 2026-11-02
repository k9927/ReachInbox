import { NextFunction, Response } from "express";
import { prisma } from "../config/database";
import { AuthenticatedRequest } from "./auth.middleware";
import { env } from "../config/env";

export async function requireQueueAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const user = req.userId ? await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } }) : null;
    if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    // If admin emails are configured, enforce access; otherwise allow authenticated users in development
    if (env.QUEUE_ADMIN_EMAILS.length > 0 && !env.QUEUE_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return res.status(403).json({ success: false, message: "Administrator access required" });
    }
    return next();
}
