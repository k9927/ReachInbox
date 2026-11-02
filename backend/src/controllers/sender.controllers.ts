import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { encryptToken } from "../services/token-encryption.service";
import { env } from "../config/env";

const senderSchema = z.object({
    email: z.string().email().max(320),
    name: z.string().trim().max(120).optional(),
    smtpHost: z.string().trim().min(1).max(253).optional(),
    smtpPort: z.number().int().min(1).max(65535).optional(),
    smtpSecure: z.boolean().optional(),
    smtpUsername: z.string().min(1).max(320).optional(),
    smtpPassword: z.string().min(1).max(2048).optional()
}).superRefine((data, context) => {
    const provided = [data.smtpHost, data.smtpPort, data.smtpUsername, data.smtpPassword].filter((value) => value !== undefined).length;
    if (provided !== 0 && provided !== 4) {
        context.addIssue({ code: "custom", message: "Provide SMTP host, port, username, and password together", path: ["smtpHost"] });
    }
});

export async function listSenders(req: AuthenticatedRequest, res: Response) {
    const senders = await prisma.sender.findMany({
        where: { userId: req.userId },
        select: { id: true, email: true, name: true, createdAt: true },
        orderBy: { createdAt: "asc" }
    });
    return res.json({ success: true, senders });
}

export async function createSender(req: AuthenticatedRequest, res: Response) {
    const parsed = senderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid sender", errors: parsed.error.flatten() });
    if (parsed.data.smtpHost && !env.SMTP_ALLOWED_HOSTS.includes(parsed.data.smtpHost.toLowerCase())) {
        return res.status(400).json({ success: false, message: "This SMTP host is not allowed by the server" });
    }
    try {
        const sender = await prisma.sender.create({
            data: {
                userId: req.userId!, email: parsed.data.email.toLowerCase(), name: parsed.data.name,
                smtpHost: parsed.data.smtpHost,
                smtpPort: parsed.data.smtpPort,
                smtpSecure: parsed.data.smtpSecure ?? false,
                smtpAuthEncrypted: parsed.data.smtpUsername && parsed.data.smtpPassword
                    ? encryptToken(JSON.stringify({ user: parsed.data.smtpUsername, pass: parsed.data.smtpPassword }))
                    : null
            },
            select: { id: true, email: true, name: true, createdAt: true, smtpHost: true }
        });
        return res.status(201).json({ success: true, sender: { ...sender, customSmtp: Boolean(sender.smtpHost) } });
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return res.status(409).json({ success: false, message: "This sender is already connected" });
        }
        throw error;
    }
}

export async function deleteSender(req: Request, res: Response) {
    const userId = (req as AuthenticatedRequest).userId;
    const senderId = z.string().uuid().safeParse(req.params.id);
    if (!senderId.success) return res.status(400).json({ success: false, message: "Invalid sender ID" });
    const existing = await prisma.sender.findFirst({ where: { id: senderId.data, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Sender not found" });
    const used = await prisma.campaign.count({ where: { senderId: existing.id } });
    if (used > 0) return res.status(409).json({ success: false, message: "Sender is used by existing campaigns" });
    await prisma.sender.delete({ where: { id: existing.id } });
    return res.json({ success: true });
}
