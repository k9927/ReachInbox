import { request, API_BASE } from "./client";
import { SlackChannel, SlackStatus } from "../types";

export async function fetchSlackStatus(): Promise<SlackStatus> {
  return request<SlackStatus>("/api/slack/status");
}

export async function fetchSlackChannels(): Promise<SlackChannel[]> {
  try {
    const data = await request<{ success: boolean; channels: SlackChannel[] }>("/api/slack/channels");
    return data.channels || [];
  } catch {
    return [];
  }
}

export async function updateSlackChannel(channelId: string): Promise<void> {
  await request<{ success: boolean }>("/api/slack/channel", {
    method: "PUT",
    body: JSON.stringify({ channelId }),
  });
}

export async function disconnectSlack(): Promise<void> {
  await request<{ success: boolean }>("/api/slack/disconnect", {
    method: "DELETE",
  });
}

export function getSlackConnectUrl(): string {
  return `${API_BASE}/api/slack/connect`;
}

export function getBullBoardUrl(): string {
  return `${API_BASE}/admin/queues`;
}
