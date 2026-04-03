import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Locale,
  translations,
  isLocale,
  LOCALES,
} from "./locales";

const STORAGE_KEY = "gomate-locale";

function detectBrowserLocale(): Locale {
  const raw =
    typeof navigator !== "undefined"
      ? navigator.language || navigator.languages?.[0] || "pl"
      : "pl";
  const code = raw.split("-")[0]?.toLowerCase() ?? "pl";
  return isLocale(code) ? code : "pl";
}

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return detectBrowserLocale();
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      const table = translations[locale];
      const value = table[key];
      if (value !== undefined) return value;
      const fallback = translations.pl[key];
      if (fallback !== undefined) return fallback;
      return key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}

export { LOCALES, type Locale };
