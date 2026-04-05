import { useTranslation, LOCALES, type Locale } from "./context";
import { FlagIcon } from "./FlagIcon";

const LABELS: Record<Locale, string> = {
  pl: "PL",
  en: "EN",
  de: "DE",
  ru: "RU",
  uk: "UA",
  es: "ES",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex max-w-[min(100%,22rem)] shrink-0 flex-wrap justify-end gap-1 rounded-full border border-white/70 bg-white/75 px-1 py-1 shadow-sm backdrop-blur-md sm:max-w-none">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          title={code.toUpperCase()}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-all duration-200 motion-safe:hover:scale-[1.05] motion-safe:active:scale-[0.96] sm:gap-1.5 sm:px-2.5 ${
            locale === code
              ? "bg-[#163c59] text-white shadow-md [&_svg]:ring-white/30"
              : "text-[#28475d] hover:bg-white/95 hover:shadow-sm"
          }`}
        >
          <span
            className="gomate-icon-pop flex shrink-0 items-center justify-center"
            aria-hidden
          >
            <FlagIcon locale={code} />
          </span>
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
