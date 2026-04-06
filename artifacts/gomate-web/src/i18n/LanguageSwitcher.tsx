import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent | TouchEvent) {
      const el = rootRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function select(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      {/* Mobile: compact trigger + popover */}
      <div className="md:hidden">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={t("language.switcher.openMenu")}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-bold text-[#28475d] shadow-sm backdrop-blur-md transition hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8] motion-safe:active:scale-[0.98]"
        >
          <span className="gomate-icon-pop flex shrink-0 items-center justify-center">
            <FlagIcon locale={locale} className="!h-[13px] !w-[18px]" />
          </span>
          <span className="tabular-nums">{LABELS[locale]}</span>
          <motion.span
            aria-hidden
            className="inline-flex text-[#5a7389]"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        </button>

        <AnimatePresence>
          {open ? (
            <motion.div
              id={menuId}
              role="listbox"
              aria-label={t("language.switcher.listLabel")}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="absolute right-0 z-[200] mt-2 max-h-[min(70vh,22rem)] w-[min(100vw-2rem,16rem)] overflow-y-auto rounded-[20px] border border-white/85 bg-white/95 p-2 shadow-[0_24px_60px_rgba(23,54,81,0.22)] backdrop-blur-xl"
            >
              {LOCALES.map((code) => {
                const active = locale === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => select(code)}
                    className={`flex w-full min-h-[48px] items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${
                      active
                        ? "bg-[#163c59] text-white shadow-md"
                        : "text-[#28475d] hover:bg-[#f0f6fa]"
                    }`}
                  >
                    <span className="gomate-icon-pop flex shrink-0 items-center justify-center">
                      <FlagIcon locale={code} className="!h-[13px] !w-[18px]" />
                    </span>
                    <span className="tabular-nums">{LABELS[code]}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Desktop: full inline row */}
      <div className="hidden max-w-none flex-wrap justify-end gap-1 rounded-full border border-white/70 bg-white/75 px-1 py-1 shadow-sm backdrop-blur-md md:flex">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            title={code.toUpperCase()}
            aria-label={`${LABELS[code]}`}
            aria-current={locale === code ? "true" : undefined}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-all duration-200 motion-safe:hover:scale-[1.05] motion-safe:active:scale-[0.96] md:gap-1.5 md:px-2.5 ${
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
    </div>
  );
}
