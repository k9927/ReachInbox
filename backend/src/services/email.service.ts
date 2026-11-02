
import nodemailer from "nodemailer";
import { env } from "../config/env";

interface SendEmailParams {
    from: string;
    to: string;
    subject: string;
    body: string;
    smtp?: { host: string; port: number; secure: boolean; user: string; pass: string };
}

export async function sendEmail(data: SendEmailParams) {

    const smtp = data.smtp;
    if (smtp && !env.SMTP_ALLOWED_HOSTS.includes(smtp.host.toLowerCase())) {
        throw new Error("Sender SMTP host is no longer allowed by the server");
    }
    if (!smtp && (!env.ETHEREAL_USER || !env.ETHEREAL_PASS)) {
        throw new Error("Ethereal SMTP credentials are missing");
    }

    const transporter = nodemailer.createTransport(smtp ? {
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        connectionTimeout: 30_000,
        greetingTimeout: 30_000,
        socketTimeout: 60_000,
        auth: { user: smtp.user, pass: smtp.pass }
    } : {
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        connectionTimeout: 30_000,
        greetingTimeout: 30_000,
        socketTimeout: 60_000,
        auth: { user: env.ETHEREAL_USER, pass: env.ETHEREAL_PASS }
    });
    const info = await transporter.sendMail({
        from: data.from,
        to: data.to,
        subject: data.subject,
        text: data.body
    });

    return {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
    };
}
