import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { useTranslation } from "../i18n";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { messageFromApiError } from "../lib/errorMessages";

type PendingTask = {
  id: string;
  tripId: string;
  targetUserId: string;
  targetName: string;
  tripLabel: string;
  createdAt: string;
};

type Step = "happened" | "rate" | "noshow";

const NO_SHOW_KEYS = [
  "reviewModal.noShowDriver",
  "reviewModal.noShowPassenger",
  "reviewModal.noShowCancelled",
  "reviewModal.noShowOther",
] as const;

const NO_SHOW_VALUES = [
  "driver_no_show",
  "passenger_no_show",
  "trip_cancelled",
  "other",
] as const;

export function ReviewPendingModal() {
  const { t } = useTranslation();
  const { reviewTasksPending, refresh } = useNotificationCounts();

  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState<Step>("happened");
  const [tripHappenedChoice, setTripHappenedChoice] = useState<boolean | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [noShowReason, setNoShowReason] = useState<(typeof NO_SHOW_VALUES)[number]>(
    "driver_no_show"
  );

  const current = tasks[0] ?? null;

  const loadTasks = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/review-tasks/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(messageFromApiError(data, t, "reviewModal.loadError"));
        setTasks([]);
        return;
      }
      const list = Array.isArray(data.tasks) ? data.tasks : [];
      setTasks(list);
      if (list.length > 0) {
        setOpen(true);
        setStep("happened");
        setTripHappenedChoice(null);
        setRating(5);
        setComment("");
        setNoShowReason("driver_no_show");
      } else {
        setOpen(false);
      }
    } catch {
      setError(t("reviewModal.loadError"));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (reviewTasksPending > 0) {
      void loadTasks();
    } else {
      setTasks([]);
      setOpen(false);
    }
  }, [reviewTasksPending, loadTasks]);

  const needsComment = useMemo(() => tripHappenedChoice === true && rating <= 3, [
    tripHappenedChoice,
    rating,
  ]);

  async function submit() {
    if (!current) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    if (step === "happened" && tripHappenedChoice === null) {
      setError(t("reviewModal.pickHappened"));
      return;
    }

    if (step === "rate") {
      if (needsComment && !comment.trim()) {
        setError(t("reviewModal.commentRequiredLowRating"));
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const trimmed = comment.trim();
      const body =
        step === "noshow" || tripHappenedChoice === false
          ? {
              tripHappened: false,
              noShowReason,
              comment: trimmed || undefined,
            }
          : {
              tripHappened: true,
              rating,
              comment:
                rating <= 3 ? trimmed : trimmed.length > 0 ? trimmed : undefined,
            };

      const res = await fetch(
        `${API_BASE_URL}/api/review-tasks/${current.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(messageFromApiError(data, t, "reviewModal.submitError"));
        return;
      }

      await refresh();
      setStep("happened");
      setTripHappenedChoice(null);
      setRating(5);
      setComment("");
      setNoShowReason("driver_no_show");
      await loadTasks();
    } catch {
      setError(t("reviewModal.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  function onPickHappened(yes: boolean) {
    setTripHappenedChoice(yes);
    setError("");
    if (yes) {
      setStep("rate");
    } else {
      setStep("noshow");
    }
  }

  if (!open || !current) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div
        className="relative w-full max-w-lg rounded-[28px] border border-white/70 bg-[#f4fbff] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-[#29485d] shadow-sm"
          onClick={() => setOpen(false)}
        >
          {t("reviewModal.close")}
        </button>

        <h2 id="review-modal-title" className="pr-12 text-xl font-extrabold text-[#173651]">
          {t("reviewModal.title")}
        </h2>
        <p className="mt-1 text-sm text-[#4a6678]">
          {t("reviewModal.tripLabel", { label: current.tripLabel })}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#173651]">
          {t("reviewModal.targetLabel", { name: current.targetName })}
        </p>

        {loading && (
          <p className="mt-4 text-sm text-[#5d7485]">{t("reviewModal.loading")}</p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-[#f5cfcf] bg-[#fff4f4] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        )}

        {!loading && step === "happened" && (
          <div className="mt-6 space-y-4">
            <p className="text-base font-semibold text-[#28475d]">
              {t("reviewModal.tripQuestion")}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onPickHappened(true)}
                className="flex-1 rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 py-3 text-sm font-bold text-white shadow-md"
              >
                {t("reviewModal.yes")}
              </button>
              <button
                type="button"
                onClick={() => onPickHappened(false)}
                className="flex-1 rounded-full border border-white/90 bg-white px-6 py-3 text-sm font-bold text-[#29485d] shadow-sm"
              >
                {t("reviewModal.no")}
              </button>
            </div>
          </div>
        )}

        {!loading && step === "rate" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm font-semibold text-[#28475d]">{t("reviewModal.ratingLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`h-11 min-w-[2.75rem] rounded-full px-3 text-sm font-bold shadow-sm ${
                    rating === n
                      ? "bg-[#163c59] text-white"
                      : "bg-white text-[#29485d] ring-1 ring-[#d7e4eb]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <label className="block text-sm font-semibold text-[#28475d]">
              {t("reviewModal.commentLabel")}
              {needsComment ? " *" : ""}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={t("reviewModal.commentPlaceholder")}
              className="w-full rounded-2xl border border-[#d7e4eb] bg-white px-4 py-3 text-sm text-[#193549] outline-none placeholder:text-[#7a94a5]"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] text-sm font-bold text-white shadow-md disabled:opacity-70"
            >
              {submitting ? t("reviewModal.submitting") : t("reviewModal.submit")}
            </button>
          </div>
        )}

        {!loading && step === "noshow" && (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-[#28475d]">
              {t("reviewModal.reasonLabel")}
            </label>
            <select
              value={noShowReason}
              onChange={(e) =>
                setNoShowReason(e.target.value as (typeof NO_SHOW_VALUES)[number])
              }
              className="w-full rounded-2xl border border-[#d7e4eb] bg-white px-4 py-3 text-sm text-[#193549] outline-none"
            >
              {NO_SHOW_VALUES.map((val, i) => (
                <option key={val} value={val}>
                  {t(NO_SHOW_KEYS[i]!)}
                </option>
              ))}
            </select>
            <label className="block text-sm font-semibold text-[#28475d]">
              {t("reviewModal.commentOptional")}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-[#d7e4eb] bg-white px-4 py-3 text-sm text-[#193549] outline-none"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] text-sm font-bold text-white shadow-md disabled:opacity-70"
            >
              {submitting ? t("reviewModal.submitting") : t("reviewModal.submit")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
