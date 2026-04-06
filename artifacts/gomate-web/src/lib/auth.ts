import { API_BASE_URL } from "./api";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "driver" | "passenger" | "both";
  language: "pl" | "en" | "de" | "ru" | "uk" | "es";
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  carBrand?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carPlateNumber?: string | null;
  age?: number | null;
  rating?: number | null;
  co2SavedKg?: number | null;
  createdAt: string;
  emailVerified?: boolean;
  termsAccepted?: boolean;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  /** How many reviews this user has received */
  reviewCount?: number | null;
};

/**
 * Pulls the user object from typical API envelopes:
 * `{ user }`, `{ data: { user } }`, or a bare user object `{ id, email, ... }`.
 */
export function parseApiUserEnvelope(data: unknown): unknown | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  if (o.user && typeof o.user === "object") return o.user;

  if (o.data && typeof o.data === "object") {
    const inner = o.data as Record<string, unknown>;
    if (inner.user && typeof inner.user === "object") return inner.user;
  }

  if (typeof o.id === "string" && typeof o.email === "string") return o;

  return null;
}

/**
 * Normalizes `/api/auth/me` and `/api/profile/me` user payloads into `CurrentUser`.
 * Merges common avatar field names so the header always receives a single `avatarUrl`.
 */
export function normalizeCurrentUserFromApi(raw: unknown): CurrentUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;

  const fromAvatarUrl =
    typeof u.avatarUrl === "string" ? u.avatarUrl.trim() : "";
  const fromAvatar = typeof u.avatar === "string" ? u.avatar.trim() : "";
  const fromSnake =
    typeof u.avatar_url === "string" ? u.avatar_url.trim() : "";
  const fromImage = typeof u.image === "string" ? u.image.trim() : "";
  const avatarUrl =
    fromAvatarUrl || fromAvatar || fromSnake || fromImage || null;

  if (import.meta.env.DEV) {
    const keys = Object.keys(u).filter((k) => /avatar|photo|image/i.test(k));
    if (keys.length > 0) {
      console.debug("[gomate/auth] user payload avatar-related keys:", keys);
    }
  }

  return {
    ...(u as unknown as CurrentUser),
    avatarUrl,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem("token");
      return null;
    }

    const data = await response.json();
    const raw = parseApiUserEnvelope(data);
    return normalizeCurrentUserFromApi(raw);
  } catch {
    return null;
  }
}
