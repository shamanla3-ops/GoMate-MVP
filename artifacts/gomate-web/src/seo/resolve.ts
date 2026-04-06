import { findCity } from "./cities";
import { slugToIntent } from "./slugs";
import type { SeoLang, SeoPageModel } from "./types";
import { SEO_LANGS } from "./types";

export function isSeoLang(x: string): x is SeoLang {
  return (SEO_LANGS as readonly string[]).includes(x);
}

export function resolveSeoPage(
  langRaw: string | undefined,
  cityRaw: string | undefined,
  slugRaw: string | undefined
): SeoPageModel | null {
  if (!langRaw || !cityRaw || !slugRaw) return null;
  const lang = langRaw.toLowerCase();
  const citySlug = cityRaw.toLowerCase();
  const slug = slugRaw.toLowerCase();

  if (!isSeoLang(lang)) return null;

  const city = findCity(lang, citySlug);
  if (!city) return null;

  const intent = slugToIntent(lang, slug);
  if (!intent) return null;

  return { lang, city, intent, slug };
}
