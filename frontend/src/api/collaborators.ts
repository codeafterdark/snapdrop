import apiClient from "./client";

export interface CollaboratorPublic {
  id: string;
  invited_email: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  status: "pending" | "accepted";
  invited_at: string;
  accepted_at: string | null;
}

export interface InviteInfo {
  event_id: string;
  event_name: string;
  invited_by_name: string;
  status: "pending" | "accepted";
}

export interface PendingInvite {
  id: string;
  token: string;
  event_id: string;
  event_name: string;
  invited_by_name: string;
}

export const collaboratorsApi = {
  invite: (eventId: string, email: string) =>
    apiClient
      .post<CollaboratorPublic>(`/api/v1/events/${eventId}/collaborators/invite`, { email })
      .then((r) => r.data),

  list: (eventId: string) =>
    apiClient
      .get<CollaboratorPublic[]>(`/api/v1/events/${eventId}/collaborators`)
      .then((r) => r.data),

  remove: (eventId: string, collaboratorId: string) =>
    apiClient.delete(`/api/v1/events/${eventId}/collaborators/${collaboratorId}`),

  listPending: () =>
    apiClient.get<PendingInvite[]>("/api/v1/invites/pending").then((r) => r.data),

  getInvite: (token: string) =>
    apiClient.get<InviteInfo>(`/api/v1/invites/${token}`).then((r) => r.data),

  acceptInvite: (token: string) =>
    apiClient
      .post<{ event_id: string }>(`/api/v1/invites/${token}/accept`)
      .then((r) => r.data),
};
