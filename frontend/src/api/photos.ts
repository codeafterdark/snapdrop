import axios from "axios";
import apiClient from "./client";
import { PaginatedResponse } from "./events";

export interface PhotoPublic {
  id: string;
  signed_url: string;
  file_name: string;
  file_size_bytes: number;
  uploaded_at: string;
  attendee_name: string;
  attendee_id: string;
  mime_type: string;
}

export interface UploadUrlResponse {
  upload_url: string;
  r2_key: string;
  expires_in: number;
}

export const photosApi = {
  list: (eventId: string, page = 1) =>
    apiClient
      .get<PaginatedResponse<PhotoPublic>>(`/api/v1/events/${eventId}/photos?page=${page}`)
      .then((r) => r.data),

  requestUploadUrl: (
    eventId: string,
    deviceToken: string,
    file: { name: string; size: number; type: string }
  ) =>
    apiClient
      .post<UploadUrlResponse>(
        `/api/v1/events/${eventId}/photos/upload-url`,
        { file_name: file.name, file_size_bytes: file.size, mime_type: file.type },
        { headers: { "X-Device-Token": deviceToken } }
      )
      .then((r) => r.data),

  confirmUpload: (
    eventId: string,
    deviceToken: string,
    data: { r2_key: string; file_name: string; file_size_bytes: number; mime_type: string }
  ) =>
    apiClient
      .post<PhotoPublic>(`/api/v1/events/${eventId}/photos/confirm`, data, {
        headers: { "X-Device-Token": deviceToken },
      })
      .then((r) => r.data),

  uploadToR2: (uploadUrl: string, blob: Blob, mimeType: string, onProgress?: (pct: number) => void) =>
    axios.put(uploadUrl, blob, {
      headers: { "Content-Type": mimeType },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }),

  delete: (photoId: string) =>
    apiClient.delete(`/api/v1/photos/${photoId}`),

  downloadZip: (eventId: string) =>
    apiClient.get(`/api/v1/events/${eventId}/photos/zip`, { responseType: "blob" }),
};
