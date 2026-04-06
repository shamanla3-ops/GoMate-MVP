import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../lib/api";
import { useTranslation } from "../i18n";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { useSound } from "../context/SoundContext";
import { applyMatchSoundAck } from "../lib/matchSoundAck";
import { AppPageHeader } from "../components/AppPageHeader";
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "../lib/motionVariants";
import { messageFromApiError } from "../lib/errorMessages";
import { getSuccessMessage } from "../lib/successMessages";
import { formatDateTimeShort } from "../lib/intlLocale";

const WEEKDAY_VALUES = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

type MatchPref = {
  id: string;
  userId: string;
  role: "passenger" | "driver" | "both";
  originText: string;
  destinationText: string;
  preferredTime: string;
  timeFlexMinutes: number | null;
  weekdays: string[];
  isActive: boolean;
  templateId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type SuggestionReason =
  | "same_route"
  | "weekday_overlap"
  | "time_close"
  | "morning_commute"
  | "evening_commute";

type Suggestion = {
  id: string;
  kind: "trip" | "template" | "passenger_preference";
  origin: string;
  destination: string;
  weekdays: string[];
  timeLabel: string;
  reasons: SuggestionReason[];
  tripId?: string;
  templateId?: string;
  preferenceId?: string;
  otherUserId: string;
  otherUserName: string;
  priceCents?: number;
  currency?: "EUR" | "USD" | "PLN";
  availableSeats?: number;
  tripType?: "one-time" | "regular";
  isNew?: boolean;
  seenAt?: string | null;
};

function weekdayKey(day: string) {
  const map: Record<string, string> = {
    mon: "weekday.mon",
    tue: "weekday.tue",
    wed: "weekday.wed",
    thu: "weekday.thu",
    fri: "weekday.fri",
    sat: "weekday.sat",
    sun: "weekday.sun",
  };
  return map[day] ?? day;
}

function formatPrice(cents: number | undefined, curr: string | undefined) {
  if (cents === undefined || !curr) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: curr,
  }).format(cents / 100);
}

export default function SmartMatches() {
  const { t, locale } = useTranslation();
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const { playSmartMatchNew } = useSound();
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );
  const [prefs, setPrefs] = useState<MatchPref[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lastNewNotifiedKeys, setLastNewNotifiedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState<"passenger" | "driver" | "both">(
    "passenger"
  );
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [preferredTime, setPreferredTime] = useState("08:00");
  const [timeFlex, setTimeFlex] = useState("30");
  const [weekdays, setWeekdays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const tok = localStorage.getItem("token");
    setToken(tok);
    if (!tok) {
      setPrefs([]);
      setSuggestions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [pr, su] = await Promise.all([
        fetch(`${API_BASE_URL}/api/match-preferences`, {
          headers: { Authorization: `Bearer ${tok}` },
        }),
        fetch(`${API_BASE_URL}/api/match-suggestions`, {
          headers: { Authorization: `Bearer ${tok}` },
        }),
      ]);
      const prData = await pr.json();
      const suData = await su.json();
      if (!pr.ok) {
        alert(messageFromApiError(prData, t, "smartMatch.errors.loadPrefs"));
        setPrefs([]);
      } else {
        setPrefs(Array.isArray(prData.preferences) ? prData.preferences : []);
      }
      if (!su.ok) {
        alert(messageFromApiError(suData, t, "smartMatch.errors.loadSuggestions"));
        setSuggestions([]);
        setLastNewNotifiedKeys([]);
      } else {
        const raw = suData as {
          suggestions?: unknown;
          newNotifiedKeys?: unknown;
        };
        const list = Array.isArray(raw.suggestions) ? (raw.suggestions as Suggestion[]) : [];
        setSuggestions(list);
        const nk = raw.newNotifiedKeys;
        setLastNewNotifiedKeys(
          Array.isArray(nk) && nk.every((k) => typeof k === "string")
            ? (nk as string[])
            : []
        );
      }
    } catch {
      alert(t("smartMatch.errors.network"));
      setPrefs([]);
      setSuggestions([]);
      setLastNewNotifiedKeys([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastNewNotifiedKeys.length === 0) return;
    applyMatchSoundAck(lastNewNotifiedKeys, () => {
      playSmartMatchNew();
    });
  }, [lastNewNotifiedKeys, playSmartMatchNew]);

  useEffect(() => {
    if (!token || loading || suggestions.length === 0) return;
    if (!suggestions.some((s) => s.isNew)) return;
    const tmr = window.setTimeout(() => {
      void (async () => {
        const tok = localStorage.getItem("token");
        if (!tok) return;
        try {
          await fetch(`${API_BASE_URL}/api/match-suggestions/seen`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tok}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ markAll: true }),
          });
          setSuggestions((prev) =>
            prev.map((s) => ({
              ...s,
              isNew: false,
              seenAt: s.seenAt ?? new Date().toISOString(),
            }))
          );
          await refreshNotificationCounts();
        } catch {
          /* ignore */
        }
      })();
    }, 650);
    return () => window.clearTimeout(tmr);
  }, [token, loading, suggestions, refreshNotificationCounts]);

  function toggleWeekday(day: string) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const tok = localStorage.getItem("token");
    if (!tok) {
      alert(t("smartMatch.login"));
      return;
    }
    if (!originText.trim() || !destinationText.trim()) {
      alert(t("smartMatch.validation.originDest"));
      return;
    }
    if (!weekdays.length) {
      alert(t("smartMatch.validation.weekdays"));
      return;
    }
    const flex = parseInt(timeFlex, 10);
    if (Number.isNaN(flex) || flex < 0 || flex > 120) {
      alert(t("smartMatch.validation.flex"));
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/api/match-preferences`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tok}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          originText: originText.trim(),
          destinationText: destinationText.trim(),
          preferredTime,
          timeFlexMinutes: flex,
          weekdays,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(messageFromApiError(data, t, "smartMatch.errors.save"));
        return;
      }
      alert(
        getSuccessMessage(
          (data as { messageCode?: string }).messageCode,
          t,
          "smartMatch.saved"
        )
      );
      setOriginText("");
      setDestinationText("");
      setNotes("");
      await load();
    } catch {
      alert(t("smartMatch.errors.network"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pref: MatchPref, next: boolean) {
    const tok = localStorage.getItem("token");
    if (!tok) return;
    const res = await fetch(
      `${API_BASE_URL}/api/match-preferences/${pref.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tok}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: next }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      alert(messageFromApiError(data, t, "smartMatch.errors.update"));
      return;
    }
    await load();
  }

  async function removePref(id: string) {
    if (!window.confirm(t("smartMatch.confirmDelete"))) return;
    const tok = localStorage.getItem("token");
    if (!tok) return;
    const res = await fetch(`${API_BASE_URL}/api/match-preferences/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tok}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(messageFromApiError(data, t, "smartMatch.errors.delete"));
      return;
    }
    alert(
      getSuccessMessage(
        (data as { messageCode?: string }).messageCode,
        t,
        "smartMatch.deleted"
      )
    );
    await load();
  }

  async function dismissSuggestion(s: Suggestion) {
    const tok = localStorage.getItem("token");
    if (!tok) return;
    let targetType: "trip" | "template" | "preference" = "trip";
    let targetId = "";
    if (s.kind === "trip" && s.tripId) {
      targetType = "trip";
      targetId = s.tripId;
    } else if (s.kind === "template" && s.templateId) {
      targetType = "template";
      targetId = s.templateId;
    } else if (s.kind === "passenger_preference" && s.preferenceId) {
      targetType = "preference";
      targetId = s.preferenceId;
    } else return;

    const res = await fetch(`${API_BASE_URL}/api/match-suggestions/dismiss`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetType, targetId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(messageFromApiError(data, t, "smartMatch.errors.dismiss"));
      return;
    }
    await load();
    await refreshNotificationCounts();
  }

  function reasonLabel(r: SuggestionReason) {
    if (r === "same_route") return t("smartMatch.reason.sameRoute");
    if (r === "weekday_overlap") return t("smartMatch.reason.weekdays");
    if (r === "time_close") return t("smartMatch.reason.time");
    if (r === "morning_commute") return t("smartMatch.reason.morningCommute");
    if (r === "evening_commute") return t("smartMatch.reason.eveningCommute");
    return r;
  }

  function formatSuggestionTime(s: Suggestion) {
    if (s.kind === "trip") {
      try {
        return formatDateTimeShort(s.timeLabel, locale);
      } catch {
        return s.timeLabel;
      }
    }
    return s.timeLabel;
  }

  return (
    <div className="min-h-screen bg-[#eef4f8] pb-24 text-[#193549]">
      <AppPageHeader>
        <nav className="flex flex-wrap items-center justify-end gap-2">
          <a href="/trips" className="gomate-nav-pill">
            {t("nav.trips")}
          </a>
          <a href="/templates" className="gomate-nav-pill">
            {t("nav.templates")}
          </a>
        </nav>
      </AppPageHeader>

      <motion.div
        className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6"
        variants={staggerContainerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.h1
          variants={staggerItemVariants}
          className="mb-4 text-2xl font-extrabold tracking-tight text-[#173651] sm:text-3xl"
        >
          {t("smartMatch.pageTitle")}
        </motion.h1>
        <motion.section
          variants={staggerItemVariants}
          className="gomate-glass-panel mb-6 p-5 sm:p-6"
        >
          <h2 className="text-lg font-extrabold text-[#173651]">
            {t("smartMatch.heroTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#4a6678]">
            {t("smartMatch.heroBody")}
          </p>
        </motion.section>

        {!token ? (
          <motion.p
            variants={staggerItemVariants}
            className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-[#4a6678]"
          >
            {t("smartMatch.loginHint")}{" "}
            <a href="/login" className="font-semibold text-[#1296e8] underline">
              {t("nav.login")}
            </a>
          </motion.p>
        ) : null}

        {token ? (
          <>
            <motion.section
              variants={staggerItemVariants}
              className="gomate-glass-panel mb-6 p-5 sm:p-6"
            >
              <h3 className="text-base font-extrabold text-[#173651]">
                {t("smartMatch.formTitle")}
              </h3>
              <form className="mt-4 space-y-4" onSubmit={handleCreate}>
                <div>
                  <label className="gomate-field-label">
                    {t("smartMatch.field.role")}
                  </label>
                  <select
                    className="gomate-field-input"
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as typeof role)
                    }
                  >
                    <option value="passenger">
                      {t("smartMatch.role.passenger")}
                    </option>
                    <option value="driver">{t("smartMatch.role.driver")}</option>
                    <option value="both">{t("smartMatch.role.both")}</option>
                  </select>
                </div>
                <div>
                  <label className="gomate-field-label">
                    {t("smartMatch.field.origin")}
                  </label>
                  <input
                    className="gomate-field-input"
                    value={originText}
                    onChange={(e) => setOriginText(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="gomate-field-label">
                    {t("smartMatch.field.destination")}
                  </label>
                  <input
                    className="gomate-field-input"
                    value={destinationText}
                    onChange={(e) => setDestinationText(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="gomate-field-label">
                      {t("smartMatch.field.time")}
                    </label>
                    <input
                      type="time"
                      className="gomate-field-input"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="gomate-field-label">
                      {t("smartMatch.field.flex")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      className="gomate-field-input"
                      value={timeFlex}
                      onChange={(e) => setTimeFlex(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="gomate-field-label">
                    {t("smartMatch.field.weekdays")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_VALUES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWeekday(d)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          weekdays.includes(d)
                            ? "bg-[#163c59] text-white shadow-sm"
                            : "bg-white/80 text-[#4a6678] ring-1 ring-white/80"
                        }`}
                      >
                        {t(weekdayKey(d))}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="gomate-field-label">
                    {t("smartMatch.field.notes")}
                  </label>
                  <textarea
                    className="gomate-field-input min-h-[88px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="gomate-btn-gradient inline-flex min-h-[3rem] w-full items-center justify-center rounded-full px-6 text-base font-semibold text-white disabled:opacity-60"
                >
                  {saving ? t("smartMatch.saving") : t("smartMatch.save")}
                </button>
              </form>
            </motion.section>

            <motion.section
              variants={staggerItemVariants}
              className="gomate-glass-panel mb-6 p-5 sm:p-6"
            >
              <h3 className="text-base font-extrabold text-[#173651]">
                {t("smartMatch.prefsTitle")}
              </h3>
              {loading ? (
                <p className="mt-3 text-sm text-[#4a6678]">{t("smartMatch.loading")}</p>
              ) : prefs.length === 0 ? (
                <p className="mt-3 text-sm text-[#4a6678]">
                  {t("smartMatch.prefsEmpty")}
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {prefs.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-[#173651]">
                            {p.originText} → {p.destinationText}
                          </p>
                          <p className="mt-1 text-xs text-[#4a6678]">
                            {p.role === "passenger"
                              ? t("smartMatch.role.passenger")
                              : p.role === "driver"
                                ? t("smartMatch.role.driver")
                                : t("smartMatch.role.both")}{" "}
                            · {p.preferredTime} · +
                            {p.timeFlexMinutes ?? 0} min ·{" "}
                            {p.weekdays.map((d) => t(weekdayKey(d))).join(", ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-bold text-[#163c59]"
                            onClick={() => toggleActive(p, !p.isActive)}
                          >
                            {p.isActive
                              ? t("smartMatch.deactivate")
                              : t("smartMatch.activate")}
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-[#f0bcbc] bg-[#fff8f8] px-3 py-1 text-xs font-bold text-[#b42318]"
                            onClick={() => void removePref(p.id)}
                          >
                            {t("smartMatch.remove")}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>

            <motion.section variants={staggerItemVariants} className="gomate-glass-panel p-5 sm:p-6">
              <h3 className="text-base font-extrabold text-[#173651]">
                {t("smartMatch.suggestionsTitle")}
              </h3>
              {loading ? (
                <p className="mt-3 text-sm text-[#4a6678]">{t("smartMatch.loading")}</p>
              ) : suggestions.length === 0 ? (
                <p className="mt-3 text-sm text-[#4a6678]">
                  {t("smartMatch.suggestionsEmpty")}
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {suggestions.map((s) => (
                    <li
                      key={s.id}
                      className={`rounded-[22px] border p-4 shadow-[0_14px_40px_rgba(23,54,81,0.08)] ${
                        s.isNew
                          ? "border-[#1296e8]/55 bg-[linear-gradient(135deg,rgba(18,150,232,0.08)_0%,rgba(255,255,255,0.92)_55%)] ring-1 ring-[#1296e8]/25"
                          : "border-white/75 bg-white/85"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#1296e8]">
                              {s.kind === "trip"
                                ? t("smartMatch.badge.trip")
                                : s.kind === "template"
                                  ? t("smartMatch.badge.template")
                                  : t("smartMatch.badge.demand")}
                            </p>
                            {s.isNew ? (
                              <span className="rounded-full bg-[#163c59] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                {t("smartMatch.badge.new")}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-base font-extrabold text-[#173651]">
                            {s.origin} → {s.destination}
                          </p>
                          <p className="mt-1 text-sm text-[#4a6678]">
                            {t("smartMatch.withUser", { name: s.otherUserName })}
                          </p>
                          <p className="mt-1 text-xs text-[#4a6678]">
                            {formatSuggestionTime(s)}
                            {s.availableSeats !== undefined
                              ? ` · ${t("smartMatch.seats", { count: s.availableSeats })}`
                              : ""}
                            {s.priceCents !== undefined
                              ? ` · ${formatPrice(s.priceCents, s.currency)}`
                              : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {s.reasons.map((r) => (
                              <span
                                key={r}
                                className="rounded-full bg-[#eef8ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#163c59] ring-1 ring-[#cfe9ff]"
                              >
                                {reasonLabel(r)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {s.kind === "trip" && s.tripId ? (
                          <a
                            href={`/trips/${s.tripId}`}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#163c59] px-4 text-sm font-bold text-white shadow-sm"
                          >
                            {t("smartMatch.cta.viewTrip")}
                          </a>
                        ) : null}
                        {s.kind === "template" ? (
                          <a
                            href="/templates"
                            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#163c59] bg-white px-4 text-sm font-bold text-[#163c59]"
                          >
                            {t("smartMatch.cta.viewTemplates")}
                          </a>
                        ) : null}
                        {s.kind === "passenger_preference" ? (
                          <a
                            href="/create-trip"
                            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#163c59] px-4 text-sm font-bold text-white shadow-sm"
                          >
                            {t("smartMatch.cta.planTrip")}
                          </a>
                        ) : null}
                        <a
                          href="/permanent-passengers"
                          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/80 bg-white/90 px-4 text-sm font-bold text-[#163c59]"
                        >
                          {t("smartMatch.cta.regularRides")}
                        </a>
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#e8e8e8] bg-white px-4 text-sm font-bold text-[#4a6678]"
                          onClick={() => void dismissSuggestion(s)}
                        >
                          {t("smartMatch.dismiss")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
