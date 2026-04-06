import { motion } from "framer-motion";
import { useTranslation } from "../i18n";
import { useNotificationCounts } from "../context/NotificationCountsContext";

/** Compact promo block linking to the Smart matches hub */
export function SmartMatchesTeaser() {
  const { t } = useTranslation();
  const { matchSuggestionsNew } = useNotificationCounts();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mb-5 rounded-[22px] border border-white/70 bg-[linear-gradient(135deg,rgba(18,150,232,0.12)_0%,rgba(138,218,51,0.14)_100%)] p-4 shadow-[0_14px_44px_rgba(23,54,81,0.08)] backdrop-blur-md sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#163c59]">
            {t("smartMatch.teaser.title")}
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-[#28475d]">
            {t("smartMatch.teaser.body")}
          </p>
          {matchSuggestionsNew > 0 ? (
            <p className="mt-2 text-sm font-bold text-[#163c59]">
              {t("smartMatch.block.newMatches", { count: matchSuggestionsNew })}
            </p>
          ) : null}
        </div>
        <a
          href="/smart-matches"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#163c59] px-5 text-sm font-bold text-white shadow-[0_10px_26px_rgba(22,60,89,0.35)] transition hover:bg-[#1a4a6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8]"
        >
          {matchSuggestionsNew > 0 ? (
            <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-white/15 px-1.5 text-[10px] font-extrabold leading-none text-white shadow-inner">
              {matchSuggestionsNew > 99 ? "99+" : matchSuggestionsNew}
            </span>
          ) : null}
          {t("smartMatch.teaser.cta")}
        </a>
      </div>
    </motion.div>
  );
}
