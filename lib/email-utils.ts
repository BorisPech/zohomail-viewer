import type { Email } from "./types";

// Avatar colors
const AVATAR_COLORS = [
  { bg: "bg-blue-500/15", text: "text-blue-400" },
  { bg: "bg-red-500/15", text: "text-red-400" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  { bg: "bg-orange-500/15", text: "text-orange-400" },
  { bg: "bg-yellow-500/15", text: "text-yellow-400" },
  { bg: "bg-violet-500/15", text: "text-violet-400" },
  { bg: "bg-teal-500/15", text: "text-teal-400" },
  { bg: "bg-pink-500/15", text: "text-pink-400" },
];

export function getAvatarColor(name: string) {
  let hash = 0;
  for (const char of name || "") {
    hash = (hash * 31 + char.charCodeAt(0)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}

export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(/[\s@]+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

export function getSenderName(address: string): string {
  if (!address) return "";
  if (address.includes("<")) {
    return address.split("<")[0].trim().replace(/['"]/g, "");
  }
  return address.split("@")[0];
}

export function getSenderEmail(address: string): string {
  if (!address) return "";
  const match = address.match(/<([^>]+)>/);
  if (match) return match[1];
  return address;
}

export function formatTime(ms: string | number | undefined): string {
  if (!ms) return "";
  const date = new Date(+ms);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatFullDate(ms: string | number | undefined): string {
  if (!ms) return "";
  return new Date(+ms).toLocaleString([], {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export function timeAgo(ms: number): string {
  if (!ms) return "-";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function isUnread(email: Email): boolean {
  return email.status === "0";
}

export function getEmailId(email: Email): string {
  return email.messageId || email.mid || "";
}

export function getEmailTime(email: Email): string | number {
  return email.receivedTime || email.sentDateInGMT || "";
}

export function decodeHtml(html: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html || "";
  return textarea.value;
}

export function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}
