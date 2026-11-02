import { Response } from "express";
import { z } from "zod";
import { EmailStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { isSearchConfigured, searchEmailIds } from "../services/search.service";

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    q: z.string().trim().max(200).optional()
});

export async function listEmails(req: AuthenticatedRequest, res: Response) {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid pagination or search parameters" });
    const { page, pageSize, q } = parsed.data;
    const isSentTab = req.path === "/sent";
    const status: EmailStatus = isSentTab ? EmailStatus.SENT : EmailStatus.SCHEDULED;
    const statuses = isSentTab ? [EmailStatus.SENT] : [EmailStatus.SCHEDULED, EmailStatus.PROCESSING];
    const where = {
        userId: req.userId!,
        status: { in: statuses },
    };
    let total = 0;
    let emails: any[] = [];

    if (q) {
        if (!req.userId) return res.status(401).json({ success: false, message: "Authentication required" });
        let elasticSearchSuccess = false;

        if (isSearchConfigured()) {
            try {
                const search = await searchEmailIds(req.userId, statuses, q, page, pageSize);
                total = search.total;
                emails = search.ids.length ? await prisma.email.findMany({
                    where: { ...where, id: { in: search.ids } },
                    select: {
                        id: true, recipient: true, subject: true, scheduledAt: true, sentAt: true,
                        status: true, error: true,
                        sender: { select: { email: true, name: true } },
                        campaign: { select: { id: true, startAt: true, hourlyLimit: true } }
                    }
                }) : [];
                const byId = new Map(emails.map((email) => [email.id, email]));
                emails = search.ids.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
                elasticSearchSuccess = true;
            } catch (error) {
                console.warn("Elasticsearch search unavailable, falling back to database query:", error instanceof Error ? error.message : "unknown error");
            }
        }

        if (!elasticSearchSuccess) {
            // Resilient fallback to PostgreSQL search across recipient, subject, body, and sender
            const searchWhere = {
                ...where,
                OR: [
                    { recipient: { contains: q, mode: "insensitive" as const } },
                    { subject: { contains: q, mode: "insensitive" as const } },
                    { body: { contains: q, mode: "insensitive" as const } },
                    { sender: { email: { contains: q, mode: "insensitive" as const } } }
                ]
            };
            [total, emails] = await prisma.$transaction([
                prisma.email.count({ where: searchWhere }),
                prisma.email.findMany({
                    where: searchWhere,
                    select: {
                        id: true, recipient: true, subject: true, scheduledAt: true, sentAt: true,
                        status: true, error: true,
                        sender: { select: { email: true, name: true } },
                        campaign: { select: { id: true, startAt: true, hourlyLimit: true } }
                    },
                    orderBy: isSentTab ? { sentAt: "desc" } : { scheduledAt: "asc" },
                    skip: (page - 1) * pageSize,
                    take: pageSize
                })
            ]);
        }
    } else {
        [total, emails] = await prisma.$transaction([
            prisma.email.count({ where }),
            prisma.email.findMany({
                where,
                select: {
                    id: true, recipient: true, subject: true, scheduledAt: true, sentAt: true,
                    status: true, error: true,
                    sender: { select: { email: true, name: true } },
                    campaign: { select: { id: true, startAt: true, hourlyLimit: true } }
                },
                orderBy: status === "SENT" ? { sentAt: "desc" } : { scheduledAt: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize
            })
        ]);
    }
    return res.json({ success: true, emails, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
