import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AttendeeState {
  deviceToken: string | null;
  displayName: string | null;
  attendeeId: string | null;
  eventSlug: string | null;
  initDeviceToken: () => string;
  setAttendeeInfo: (displayName: string, attendeeId: string, eventSlug: string) => void;
  clear: () => void;
}

export const useAttendeeStore = create<AttendeeState>()(
  persist(
    (set, get) => ({
      deviceToken: null,
      displayName: null,
      attendeeId: null,
      eventSlug: null,

      initDeviceToken: () => {
        const existing = get().deviceToken;
        if (existing) return existing;
        const token = crypto.randomUUID();
        set({ deviceToken: token });
        return token;
      },

      setAttendeeInfo: (displayName, attendeeId, eventSlug) =>
        set({ displayName, attendeeId, eventSlug }),

      clear: () => set({ displayName: null, attendeeId: null, eventSlug: null }),
    }),
    {
      name: "snapdrop-attendee",
      // Only persist the device token — clear per-event info on re-visit
      partialize: (state) => ({ deviceToken: state.deviceToken }),
    }
  )
);
