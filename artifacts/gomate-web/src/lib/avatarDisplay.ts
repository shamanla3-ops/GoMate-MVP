import { API_BASE_URL } from "./api";

/** Up to two initials from the first words of the name; "?" if empty. */
export function getAvatarInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  const letters = parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

/** Resolves stored avatar URLs for <img src> (absolute, data URLs, or API-relative paths). */
export function resolveAvatarUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  if (
    raw.startsWith("data:") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/")
  ) {
    return raw;
  }
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = raw.replace(/^\//, "");
  return `${base}/${path}`;
}
