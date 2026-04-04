import { API_BASE_URL } from "./api";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "driver" | "passenger" | "both";
  language: "pl" | "en" | "de" | "ru" | "uk";
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
  /** How many reviews this user has received */
  reviewCount?: number | null;
};

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
    return data.user ?? null;
  } catch {
    return null;
  }
}