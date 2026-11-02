import { prisma } from "../config/database";
import { closeSearchClient, indexEmailDocuments, refreshEmailIndex } from "../services/search.service";

async function main() {
    let skip = 0;
    let indexed = 0;
    const batchSize = 250;
    for (;;) {
        const rows = await prisma.email.findMany({
            select: {
                id: true, userId: true, status: true, recipient: true, subject: true,
                scheduledAt: true, sentAt: true, sender: { select: { email: true } }
            },
            orderBy: { id: "asc" },
            skip,
            take: batchSize
        });
        if (!rows.length) break;
        await indexEmailDocuments(rows.map((email) => ({
            id: email.id,
            userId: email.userId,
            status: email.status,
            recipient: email.recipient,
            senderEmail: email.sender.email,
            subject: email.subject,
            scheduledAt: email.scheduledAt,
            sentAt: email.sentAt
        })));
        indexed += rows.length;
        skip += rows.length;
        process.stdout.write(`Indexed ${indexed} emails\n`);
    }
    await refreshEmailIndex();
    process.stdout.write(`Reindex finished: ${indexed} emails\n`);
}

main().catch((error) => {
    console.error("Email reindex failed", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
}).finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), closeSearchClient()]);
});
