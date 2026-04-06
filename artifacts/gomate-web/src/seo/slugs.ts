import type { SeoIntent, SeoLang } from "./types";

/** Maps URL slug segment → intent (per language). */
export const SLUG_TO_INTENT: Record<SeoLang, Record<string, SeoIntent>> = {
  pl: {
    "wspolne-przejazdy": "shared_rides",
    "dojazdy-do-pracy": "commute",
    "tanie-przejazdy": "cheap_rides",
  },
  de: {
    mitfahrgelegenheit: "shared_rides",
    pendeln: "commute",
    "gunstige-fahrten": "cheap_rides",
  },
  es: {
    "compartir-viaje": "shared_rides",
    "ir-al-trabajo": "commute",
    "viajes-baratos": "cheap_rides",
  },
  en: {
    "shared-rides": "shared_rides",
    commute: "commute",
    "cheap-rides": "cheap_rides",
  },
  uk: {
    "spilni-poizdky": "shared_rides",
    "doizd-na-robotu": "commute",
    "deshevi-poizdky": "cheap_rides",
  },
  ru: {
    "sovmestnye-poezdki": "shared_rides",
    "doezd-na-rabotu": "commute",
    "deshevye-poezdki": "cheap_rides",
  },
};

const INTENT_TO_SLUG: Record<SeoLang, Record<SeoIntent, string>> = {
  pl: {
    shared_rides: "wspolne-przejazdy",
    commute: "dojazdy-do-pracy",
    cheap_rides: "tanie-przejazdy",
  },
  de: {
    shared_rides: "mitfahrgelegenheit",
    commute: "pendeln",
    cheap_rides: "gunstige-fahrten",
  },
  es: {
    shared_rides: "compartir-viaje",
    commute: "ir-al-trabajo",
    cheap_rides: "viajes-baratos",
  },
  en: {
    shared_rides: "shared-rides",
    commute: "commute",
    cheap_rides: "cheap-rides",
  },
  uk: {
    shared_rides: "spilni-poizdky",
    commute: "doizd-na-robotu",
    cheap_rides: "deshevi-poizdky",
  },
  ru: {
    shared_rides: "sovmestnye-poezdki",
    commute: "doezd-na-rabotu",
    cheap_rides: "deshevye-poezdki",
  },
};

export function intentToSlug(lang: SeoLang, intent: SeoIntent): string {
  return INTENT_TO_SLUG[lang][intent];
}

export function slugToIntent(lang: SeoLang, slug: string): SeoIntent | undefined {
  return SLUG_TO_INTENT[lang][slug];
}

/** All SEO path slugs for a language (for sitemap). */
export function allSeoSlugsForLang(lang: SeoLang): string[] {
  return Object.keys(SLUG_TO_INTENT[lang]);
}
