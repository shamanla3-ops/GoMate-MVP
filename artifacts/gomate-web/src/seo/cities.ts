import type { SeoCity, SeoLang } from "./types";

/**
 * Cities per language. Add rows to scale; URLs stay /:lang/:citySlug/:seoSlug.
 * Keep slugs stable (ASCII, lowercase, hyphenated).
 */
export const CITIES_BY_LANG: Record<SeoLang, SeoCity[]> = {
  pl: [
    { slug: "szczecin", name: "Szczecin", locativePl: "Szczecinie" },
    { slug: "warszawa", name: "Warszawa", locativePl: "Warszawie" },
    { slug: "krakow", name: "Kraków", locativePl: "Krakowie" },
  ],
  de: [
    { slug: "berlin", name: "Berlin" },
    { slug: "hamburg", name: "Hamburg" },
    { slug: "munich", name: "München" },
  ],
  es: [
    { slug: "madrid", name: "Madrid" },
    { slug: "barcelona", name: "Barcelona" },
    { slug: "valencia", name: "Valencia" },
  ],
  en: [
    { slug: "london", name: "London" },
    { slug: "manchester", name: "Manchester" },
    { slug: "birmingham", name: "Birmingham" },
  ],
  uk: [
    { slug: "kyiv", name: "Київ", locativeUk: "Києві" },
    { slug: "lviv", name: "Львів", locativeUk: "Львові" },
    { slug: "odessa", name: "Одеса", locativeUk: "Одесі" },
  ],
  ru: [
    { slug: "moscow", name: "Москва", locativeRu: "Москве" },
    {
      slug: "saint-petersburg",
      name: "Санкт-Петербург",
      locativeRu: "Санкт-Петербурге",
    },
    { slug: "kazan", name: "Казань", locativeRu: "Казани" },
  ],
};

export function findCity(lang: SeoLang, citySlug: string): SeoCity | undefined {
  const list = CITIES_BY_LANG[lang];
  return list.find((c) => c.slug === citySlug);
}
