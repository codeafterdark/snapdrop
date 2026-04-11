import apiClient from "./client";

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  plan: string;
}

export const authApi = {
  me: () => apiClient.get<UserProfile>("/api/v1/auth/me").then((r) => r.data),
};
