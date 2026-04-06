/// <reference types="vite/client" />

import { CITIES_BY_LANG } from "./cities";
import { allSeoSlugsForLang } from "./slugs";
import { SEO_LANGS } from "./types";

const DEFAULT_SITE_ORIGIN = "https://getgomate.com";

/** Canonical origin for sitemap generation (Node) and shared helpers. */
export const SITE_ORIGIN = (() => {
  const vite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env.VITE_SITE_ORIGIN === "string"
      ? import.meta.env.VITE_SITE_ORIGIN
      : undefined;
  if (vite) return vite;
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  const nodeEnv =
    typeof proc?.env?.VITE_SITE_ORIGIN === "string" ? proc.env.VITE_SITE_ORIGIN : undefined;
  return nodeEnv || DEFAULT_SITE_ORIGIN;
})();

/** Core app routes to keep in sitemap alongside SEO landings. */
export const STATIC_SITEMAP_PATHS: { path: string; changefreq: string; priority: string }[] =
  [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/trips", changefreq: "daily", priority: "0.9" },
    { path: "/login", changefreq: "weekly", priority: "0.8" },
    { path: "/register", changefreq: "weekly", priority: "0.8" },
    { path: "/profile", changefreq: "weekly", priority: "0.7" },
    { path: "/smart-matches", changefreq: "weekly", priority: "0.8" },
    { path: "/create-trip", changefreq: "weekly", priority: "0.7" },
    { path: "/templates", changefreq: "weekly", priority: "0.7" },
    { path: "/requests", changefreq: "weekly", priority: "0.7" },
    { path: "/chats", changefreq: "weekly", priority: "0.7" },
    { path: "/privacy", changefreq: "monthly", priority: "0.5" },
    { path: "/cookies", changefreq: "monthly", priority: "0.5" },
    { path: "/terms", changefreq: "monthly", priority: "0.6" },
    { path: "/legal", changefreq: "monthly", priority: "0.6" },
  ];

/** All dynamic SEO URLs: /:lang/:city/:seoSlug */
export function getAllSeoPaths(): string[] {
  const out: string[] = [];
  for (const lang of SEO_LANGS) {
    const cities = CITIES_BY_LANG[lang];
    const slugs = allSeoSlugsForLang(lang);
    for (const c of cities) {
      for (const s of slugs) {
        out.push(`/${lang}/${c.slug}/${s}`);
      }
    }
  }
  return out;
}

export function absoluteUrl(path: string): string {
  const base = SITE_ORIGIN.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
