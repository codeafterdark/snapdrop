import axios from "axios";
import { AttendeeEventView } from "./events";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface AttendeeJoinResponse {
  attendee_id: string;
  event: AttendeeEventView;
}

export const attendeesApi = {
  join: (slug: string, deviceToken: string, displayName: string) =>
    axios
      .post<AttendeeJoinResponse>(`${baseUrl}/api/v1/e/${slug}/join`, {
        device_token: deviceToken,
        display_name: displayName,
      })
      .then((r) => r.data),
};
