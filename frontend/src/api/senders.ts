import { request } from "./client";
import { CreateSenderPayload, Sender } from "../types";

export async function fetchSenders(): Promise<Sender[]> {
  const data = await request<{ success: boolean; senders: Sender[] }>("/api/senders");
  return data.senders;
}

export async function createSender(payload: CreateSenderPayload): Promise<Sender> {
  const data = await request<{ success: boolean; sender: Sender }>("/api/senders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.sender;
}

export async function deleteSender(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/senders/${id}`, {
    method: "DELETE",
  });
}

