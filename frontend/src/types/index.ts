export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface Sender {
  id: string;
  email: string;
  name: string | null;
  customSmtp?: boolean;
}

export type EmailStatusType = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

export interface EmailItem {
  id: string;
  recipient: string;
  sender: {
    email: string;
    name: string | null;
  };
  subject: string;
  body?: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatusType;
  error: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SlackAccountInfo {
  teamName: string | null;
  teamId?: string | null;
  channelId: string | null;
}

export interface SlackStatus {
  connected: boolean;
  account: SlackAccountInfo | null;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export interface ScheduleCampaignPayload {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayMs: number;
  hourlyLimit: number;
}

export interface CreateSenderPayload {
  email: string;
  name?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
}

export interface ParseRecipientsResult {
  valid: string[];
  invalid: Array<{
    row: number;
    value: string;
    reason: string;
  }>;
}

