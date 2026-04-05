import type { Locale } from "./locales";

const base =
  "inline-block shrink-0 overflow-hidden rounded-[2px] shadow-sm ring-1 ring-black/10";

type Props = {
  locale: Locale;
  className?: string;
};

/**
 * SVG flags render consistently on Windows desktop; emoji regional flags often do not.
 */
export function FlagIcon({ locale, className = "" }: Props) {
  const size = `h-[11px] w-[16px] sm:h-[13px] sm:w-[18px] ${base} ${className}`.trim();

  switch (locale) {
    case "pl":
      return (
        <svg className={size} viewBox="0 0 5 3" aria-hidden>
          <rect width="5" height="1.5" fill="#fff" />
          <rect y="1.5" width="5" height="1.5" fill="#dc143c" />
        </svg>
      );
    case "en":
      return (
        <svg className={size} viewBox="0 0 60 30" aria-hidden>
          <rect width="60" height="30" fill="#012169" />
          <path
            stroke="#fff"
            strokeWidth="8"
            d="M0,0 L60,30 M60,0 L0,30"
          />
          <path
            stroke="#c8102e"
            strokeWidth="5"
            d="M0,0 L60,30 M60,0 L0,30"
          />
          <path stroke="#fff" strokeWidth="10" d="M30,0 V30 M0,15 H60" />
          <path stroke="#c8102e" strokeWidth="6" d="M30,0 V30 M0,15 H60" />
        </svg>
      );
    case "de":
      return (
        <svg className={size} viewBox="0 0 5 3" aria-hidden>
          <rect width="5" height="1" fill="#000" />
          <rect y="1" width="5" height="1" fill="#dd0000" />
          <rect y="2" width="5" height="1" fill="#ffce00" />
        </svg>
      );
    case "ru":
      return (
        <svg className={size} viewBox="0 0 3 2" aria-hidden>
          <rect width="3" height="0.667" fill="#fff" />
          <rect y="0.667" width="3" height="0.667" fill="#0039a6" />
          <rect y="1.333" width="3" height="0.667" fill="#d52b1e" />
        </svg>
      );
    case "uk":
      return (
        <svg className={size} viewBox="0 0 3 2" aria-hidden>
          <rect width="3" height="1" fill="#005bbb" />
          <rect y="1" width="3" height="1" fill="#ffd500" />
        </svg>
      );
    case "es":
      return (
        <svg className={size} viewBox="0 0 3 2" aria-hidden>
          <rect width="3" height="0.5" fill="#aa151b" />
          <rect y="0.5" width="3" height="1" fill="#f1bf00" />
          <rect y="1.5" width="3" height="0.5" fill="#aa151b" />
        </svg>
      );
    default:
      return null;
  }
}
