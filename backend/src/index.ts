
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import emailRoutes from "./routes/email.routes";
import recipientRoutes from "./routes/recipient.routes";
import authRoutes from "./routes/auth.routes";
import senderRoutes from "./routes/sender.routes";
import emailListRoutes from "./routes/email-list.routes";
import { bullBoardAdapter } from "./config/bull-board";
import { requireAuth } from "./middleware/auth.middleware";
import { requireQueueAdmin } from "./middleware/queue-admin.middleware";
import slackRoutes from "./routes/slack.routes";
import { errorHandler } from "./middleware/error.middleWare";

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}));

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Health check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "ReachInbox Email Scheduler API is running"
    });
});

// Email routes
app.use("/api/emails", emailRoutes);
app.use("/api/recipients", recipientRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api/senders", senderRoutes);
app.use("/api/emails", emailListRoutes);
app.use("/admin/queues", requireAuth, requireQueueAdmin, bullBoardAdapter.getRouter());

app.use(errorHandler);

// Vercel serves the exported Express app as a function. Keep a port listener
// only for local development and other self-hosted deployments.
export default app;

if (!process.env.VERCEL || process.env.RUN_HTTP_SERVER === "1") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
