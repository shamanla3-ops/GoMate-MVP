const envApiBaseUrl = import.meta.env.VITE_API_URL;

export const API_BASE_URL =
  typeof envApiBaseUrl === "string" && envApiBaseUrl.trim().length > 0
    ? envApiBaseUrl
    : "http://localhost:4000";