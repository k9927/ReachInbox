
import { emailWorker } from "./workers/email.worker";
import { redisConnection } from "./config/redis";
import { prisma } from "./config/database";
import { dispatchPendingEmails, recoverStaleProcessingEmails } from "./services/scheduler.service";

let dispatchTask: Promise<void> | undefined;
let nextStaleRecoveryAt = 0;
function dispatchLoop() {
    if (dispatchTask) return dispatchTask;
    dispatchTask = dispatchPendingEmails().then(async () => {
        if (Date.now() >= nextStaleRecoveryAt) {
            nextStaleRecoveryAt = Date.now() + 60_000;
            await recoverStaleProcessingEmails();
        }
    })
        .catch((error) => console.error("Email outbox dispatch failed", error))
        .finally(() => { dispatchTask = undefined; });
    return dispatchTask;
}

void dispatchLoop();
const dispatchTimer = setInterval(() => void dispatchLoop(), 1000);

async function shutdown() {
    console.log("Shutting down email worker...");
    clearInterval(dispatchTimer);
    await dispatchTask;

    await emailWorker.close();
    await redisConnection.quit();
    await prisma.$disconnect();

    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("ReachInbox background worker is running");
