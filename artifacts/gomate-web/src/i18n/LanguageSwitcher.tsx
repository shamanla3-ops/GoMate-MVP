import { useTranslation, LOCALES, type Locale } from "./context";

const FLAGS: Record<Locale, string> = {
  pl: "🇵🇱",
  en: "🇬🇧",
  de: "🇩🇪",
  ru: "🇷🇺",
  uk: "🇺🇦",
};

const LABELS: Record<Locale, string> = {
  pl: "PL",
  en: "EN",
  de: "DE",
  ru: "RU",
  uk: "UA",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex max-w-[min(100%,22rem)] shrink-0 flex-wrap justify-end gap-1 rounded-full border border-white/70 bg-white/80 px-1 py-1 shadow-sm backdrop-blur-sm sm:max-w-none">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          title={code.toUpperCase()}
          className={`rounded-full px-2 py-1 text-xs font-semibold transition sm:px-2.5 ${
            locale === code
              ? "bg-[#163c59] text-white shadow-sm"
              : "text-[#28475d] hover:bg-white/90"
          }`}
        >
          <span className="mr-0.5 sm:mr-1" aria-hidden>
            {FLAGS[code]}
          </span>
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
