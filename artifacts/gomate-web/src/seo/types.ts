/** Supported SEO landing languages (URL segment + copy). */
export const SEO_LANGS = ["pl", "de", "es", "en", "uk", "ru"] as const;
export type SeoLang = (typeof SEO_LANGS)[number];

/** Three scalable intents mirrored across locales via slugs. */
export type SeoIntent = "shared_rides" | "commute" | "cheap_rides";

export type SeoCity = {
  /** URL segment, lowercase ASCII (e.g. szczecin, berlin). */
  slug: string;
  /** Display name for this locale (titles, H1, body). */
  name: string;
  /**
   * Polish locative after "w" (e.g. Szczecinie). Optional; fallback uses name.
   */
  locativePl?: string;
  /** Ukrainian locative after "у" (e.g. Києві). */
  locativeUk?: string;
  /** Russian prepositional after "в" (e.g. Москве). */
  locativeRu?: string;
};

export type SeoPageModel = {
  lang: SeoLang;
  intent: SeoIntent;
  city: SeoCity;
  slug: string;
};
