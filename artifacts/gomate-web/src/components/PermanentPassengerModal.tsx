import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "../i18n";
import { messageFromApiError } from "../lib/errorMessages";
import { messageFromApiSuccess } from "../lib/successMessages";
import {
  createPpRequest,
  type PpDirection,
} from "../lib/permanentPassengersApi";
import {
  reviewModalBackdropVariants,
  reviewModalEase,
  reviewModalPanelVariants,
} from "../lib/motionVariants";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  direction: PpDirection;
  targetUserId: string;
  targetDisplayName?: string;
  defaultWeekdays?: string[];
  defaultPreferredTime?: string;
  tripId?: string | null;
  templateId?: string | null;
  originText?: string | null;
  destinationText?: string | null;
  onSuccess?: () => void;
};

export function PermanentPassengerModal({
  open,
  onClose,
  direction,
  targetUserId,
  targetDisplayName,
  defaultWeekdays,
  defaultPreferredTime,
  tripId,
  templateId,
  originText,
  destinationText,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preferredTime, setPreferredTime] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setSuccess("");
    const next = new Set<string>();
    const seed = defaultWeekdays?.length
      ? defaultWeekdays.map((d) => d.toLowerCase())
      : ["mon", "tue", "wed", "thu", "fri"];
    for (const d of seed) {
      if (WEEKDAY_KEYS.includes(d as (typeof WEEKDAY_KEYS)[number])) {
        next.add(d);
      }
    }
    setSelected(next);
    setPreferredTime(defaultPreferredTime?.trim() ?? "");
    setNote("");
  }, [open, defaultWeekdays, defaultPreferredTime]);

  const routeLine = useMemo(() => {
    if (originText && destinationText) {
      return `${originText} → ${destinationText}`;
    }
    return "";
  }, [originText, destinationText]);

  function toggleDay(day: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(day)) n.delete(day);
      else n.add(day);
      return n;
    });
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");
    const weekdays = WEEKDAY_KEYS.filter((d) => selected.has(d));
    if (weekdays.length === 0) {
      setError(t("ppModal.error.weekdays"));
      return;
    }

    setSubmitting(true);
    try {
      const data = await createPpRequest({
        direction,
        targetUserId,
        weekdays,
        preferredTime: preferredTime.trim() || null,
        note: note.trim() || null,
        tripId: tripId ?? null,
        templateId: templateId ?? null,
      });
      setSuccess(
        messageFromApiSuccess(
          data as { messageCode?: string },
          t,
          "ppModal.successDefault"
        )
      );
      onSuccess?.();
      window.setTimeout(() => {
        onClose();
      }, 650);
    } catch (e: unknown) {
      const payload = e as { errorCode?: string };
      setError(messageFromApiError(payload, t, "ppModal.error.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[160] flex items-end justify-center sm:items-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={reviewModalBackdropVariants}
          transition={reviewModalEase}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0b1f2c]/45 backdrop-blur-[2px]"
            aria-label={t("ppModal.close")}
            onClick={() => !submitting && onClose()}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pp-modal-title"
            className="relative z-10 w-full max-w-lg rounded-t-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_28px_80px_rgba(23,54,81,0.18)] backdrop-blur-md sm:rounded-[28px] sm:p-6"
            variants={reviewModalPanelVariants}
            transition={reviewModalEase}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="pp-modal-title"
                  className="text-xl font-extrabold tracking-tight text-[#173651]"
                >
                  {direction === "request"
                    ? t("ppModal.title.request")
                    : t("ppModal.title.invitation")}
                </h2>
                {targetDisplayName ? (
                  <p className="mt-1 text-sm font-semibold text-[#4a6678]">
                    {targetDisplayName}
                  </p>
                ) : null}
                {routeLine ? (
                  <p className="mt-2 rounded-2xl border border-[#d7e4eb] bg-[#f7fbfd] px-3 py-2 text-sm text-[#35556c]">
                    {routeLine}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => !submitting && onClose()}
                className="rounded-full px-3 py-1 text-sm font-bold text-[#5a7389] hover:bg-white/80"
              >
                {t("ppModal.close")}
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#4a6678]">
              {t("ppModal.intro")}
            </p>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f8798]">
                {t("ppModal.weekdaysLabel")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAY_KEYS.map((d) => {
                  const on = selected.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`rounded-full px-3 py-2 text-xs font-bold shadow-sm ring-1 transition ${
                        on
                          ? "bg-[#163c59] text-white ring-[#163c59]/30"
                          : "bg-white text-[#29485d] ring-[#d7e4eb]"
                      }`}
                    >
                      {t(`weekday.${d}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f8798]">
                {t("ppModal.preferredTimeLabel")}
              </span>
              <input
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                placeholder={t("ppModal.preferredTimePlaceholder")}
                className="gomate-field-input mt-2"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f8798]">
                {t("ppModal.noteLabel")}
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="gomate-field-input mt-2 min-h-[5.5rem] resize-y"
                placeholder={t("ppModal.notePlaceholder")}
              />
            </label>

            {error ? (
              <div className="gomate-alert-error mt-4" role="alert">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="gomate-alert-success mt-4" role="status">
                {success}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => !submitting && onClose()}
                className="gomate-btn-secondary sm:min-h-0 sm:px-6"
              >
                {t("ppModal.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex min-h-[3.25rem] items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-8 text-base font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? t("ppModal.sending") : t("ppModal.submit")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
