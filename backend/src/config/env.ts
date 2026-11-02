
import dotenv from "dotenv";

dotenv.config();

export const env = {
    PORT: Number(process.env.PORT) || 5000,
    ETHEREAL_USER: process.env.ETHEREAL_USER || "",
ETHEREAL_PASS: process.env.ETHEREAL_PASS || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
    QUEUE_ADMIN_EMAILS: (process.env.QUEUE_ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
    ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || "",
    ELASTICSEARCH_API_KEY: process.env.ELASTICSEARCH_API_KEY || "",
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || "",
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || "",
    SLACK_CALLBACK_URL: process.env.SLACK_CALLBACK_URL || "http://localhost:5000/api/slack/callback",
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY || "",
    SMTP_ALLOWED_HOSTS: (process.env.SMTP_ALLOWED_HOSTS || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean),
    FRONTEND_URL:
        process.env.FRONTEND_URL || "http://localhost:5173",

    DATABASE_URL:
        process.env.DATABASE_URL || "",

    REDIS_HOST:
        process.env.REDIS_HOST || "localhost",

    REDIS_URL:
        process.env.REDIS_URL || "",

    REDIS_PORT:
        Number(process.env.REDIS_PORT) || 6379,

    REDIS_PASSWORD:
        process.env.REDIS_PASSWORD || undefined,

    EMAIL_CONCURRENCY:
        Number(process.env.EMAIL_CONCURRENCY) || 5,

    MIN_EMAIL_DELAY_MS:
        Number(process.env.MIN_EMAIL_DELAY_MS) || 2000,

    MAX_EMAILS_PER_HOUR:
        Number(process.env.MAX_EMAILS_PER_HOUR) || 100
};
