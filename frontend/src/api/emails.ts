import { request } from "./client";
import { EmailItem, PaginationMeta, ParseRecipientsResult, ScheduleCampaignPayload } from "../types";

export interface ListEmailsResponse {
  success: boolean;
  emails: EmailItem[];
  pagination: PaginationMeta;
}

export async function fetchEmails(
  tab: "scheduled" | "sent",
  page: number,
  pageSize = 25,
  searchQuery = ""
): Promise<ListEmailsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
  });

  return request<ListEmailsResponse>(`/api/emails/${tab}?${params.toString()}`);
}

export async function scheduleCampaign(
  payload: ScheduleCampaignPayload,
  idempotencyKey: string
): Promise<{ success: boolean; campaignId: string; totalEmails: number }> {
  return request<{ success: boolean; campaignId: string; totalEmails: number }>(
    "/api/emails/schedule",
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function parseRecipientsFile(file: File): Promise<ParseRecipientsResult> {
  const form = new FormData();
  form.append("file", file);

  return request<ParseRecipientsResult>("/api/recipients/parse", {
    method: "POST",
    body: form,
  });
}
