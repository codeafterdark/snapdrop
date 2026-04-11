import { format, formatDistanceToNow } from "date-fns";

export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getEventStatus(startsAt: string, endsAt: string): "upcoming" | "active" | "closed" {
  const now = new Date();
  if (now < new Date(startsAt)) return "upcoming";
  if (now > new Date(endsAt)) return "closed";
  return "active";
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
