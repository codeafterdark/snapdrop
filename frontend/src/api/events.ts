import apiClient from "./client";

export interface EventCreate {
  name: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  attendee_cap: number;
}

export interface EventPublic {
  id: string;
  slug: string;
  name: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  attendee_cap: number;
  qr_code_url?: string;
  join_url: string;
  created_at: string;
}

export interface EventListItem {
  id: string;
  slug: string;
  name: string;
  starts_at: string;
  ends_at: string;
  attendee_cap: number;
  status: "upcoming" | "active" | "closed";
  created_at: string;
}

export interface EventStats {
  attendee_count: number;
  photo_count: number;
  storage_bytes: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface AttendeeEventView {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export const eventsApi = {
  list: (page = 1) =>
    apiClient.get<PaginatedResponse<EventListItem>>(`/api/v1/events?page=${page}`).then((r) => r.data),

  create: (data: EventCreate) =>
    apiClient.post<EventPublic>("/api/v1/events", data).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<EventPublic>(`/api/v1/events/${id}`).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string }) =>
    apiClient.patch<EventPublic>(`/api/v1/events/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/v1/events/${id}`),

  stats: (id: string) =>
    apiClient.get<EventStats>(`/api/v1/events/${id}/stats`).then((r) => r.data),

  getPublicBySlug: (slug: string) =>
    apiClient.get<AttendeeEventView>(`/api/v1/events/public/${slug}`).then((r) => r.data),
};
