import type { Locale } from "../i18n/locales";

/** BCP 47 tag for Intl.* formatters from app locale */
export function intlLocaleTag(locale: Locale): string {
  switch (locale) {
    case "uk":
      return "uk-UA";
    case "pl":
      return "pl-PL";
    case "de":
      return "de-DE";
    case "ru":
      return "ru-RU";
    case "en":
    default:
      return "en-GB";
  }
}

export function formatDateTimeShort(
  value: string,
  locale: Locale
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(intlLocaleTag(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTimeChatList(
  value: string,
  locale: Locale
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(intlLocaleTag(locale), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeOnly(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(intlLocaleTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
