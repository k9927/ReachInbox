import { request, API_BASE } from "./client";
import { User } from "../types";

export async function fetchCurrentUser(): Promise<User> {
  const data = await request<{ success: boolean; user: User }>("/api/auth/me");
  return data.user;
}

export async function logoutUser(): Promise<void> {
  await request<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export function getGoogleLoginUrl(): string {
  return `${API_BASE}/api/auth/google`;
}
