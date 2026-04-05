import pl from "./pl";
import en from "./en";
import de from "./de";
import ru from "./ru";
import uk from "./uk";
import es from "./es";

export const LOCALES = ["pl", "en", "de", "ru", "uk", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const translations: Record<Locale, Record<string, string>> = {
  pl: pl as Record<string, string>,
  en: en as Record<string, string>,
  de: de as Record<string, string>,
  ru: ru as Record<string, string>,
  uk: uk as Record<string, string>,
  es: es as Record<string, string>,
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
