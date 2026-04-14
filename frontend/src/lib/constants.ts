export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;   // 10 MB for images
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;  // 500 MB for videos
export const MAX_EVENT_DURATION_DAYS = 14;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"];
export const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export const PLAN_CAPS: Record<string, number | null> = {
  free: 5,
  starter: 50,
  pro: 100,
  business: 150,
  unlimited: null,
};

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  unlimited: "Unlimited",
};
