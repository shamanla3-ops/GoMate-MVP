import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import { useTranslation } from "../i18n";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { useSound } from "../context/SoundContext";
import { applyMatchSoundAck } from "../lib/matchSoundAck";
import { AppPageHeader } from "../components/AppPageHeader";
import { PermanentPassengerModal } from "../components/PermanentPassengerModal";
import { JoinRequestSuccessModal } from "../components/successModals/JoinRequestSuccessModal";
import { RegularRideRequestSuccessModal } from "../components/successModals/RegularRideRequestSuccessModal";
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "../lib/motionVariants";
import { messageFromApiError } from "../lib/errorMessages";
import { getSuccessMessage } from "../lib/successMessages";
import { formatDateTimeShort } from "../lib/intlLocale";
import {
  fetchPpOutgoing,
  fetchPpRelationships,
  preferredTimeFromDeparture,
  type PpRelationship,
  type PpRequest,
} from "../lib/permanentPassengersApi";

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

type OutgoingTripRequest = {
  id: string;
  tripId: string;
  seatsRequested: number;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "cancelled"
    | "cancelled_by_driver"
    | "cancelled_by_passenger";
};

function normRoute(s: string): string {
  return s.trim().toLowerCase();
}

function getActiveOutgoingForTrip(
  requests: OutgoingTripRequest[],
  tripId: string
): OutgoingTripRequest | null {
  const active = requests.find(
    (r) =>
      r.tripId === tripId &&
      (r.status === "pending" || r.status === "accepted")
  );
  return active ?? null;
}

function hasActivePpBetween(
  rels: { asDriver: PpRelationship[]; asPassenger: PpRelationship[] },
  viewerId: string,
  otherId: string,
  origin: string,
  dest: string
): boolean {
  const o = normRoute(origin);
  const d = normRoute(dest);
  const all = [...rels.asDriver, ...rels.asPassenger];
  return all.some(
    (r) =>
      r.status === "active" &&
      normRoute(r.originText ?? "") === o &&
      normRoute(r.destinationText ?? "") === d &&
      ((r.driverId === viewerId && r.passengerId === otherId) ||
        (r.driverId === otherId && r.passengerId === viewerId))
  );
}

function hasPendingPpTemplateRequest(
  outgoing: PpRequest[],
  viewerId: string,
  driverId: string,
  templateId: string,
  origin: string,
  dest: string
): boolean {
  const o = normRoute(origin);
  const d = normRoute(dest);
  return outgoing.some(
    (r) =>
      r.status === "pending" &&
      r.direction === "request" &&
      r.passengerId === viewerId &&
      r.driverId === driverId &&
      (r.templateId ?? "") === templateId &&
      normRoute(r.originText ?? "") === o &&
      normRoute(r.destinationText ?? "") === d
  );
}

function hasPendingPpInvitation(
  outgoing: PpRequest[],
  viewerId: string,
  passengerId: string,
  origin: string,
  dest: string
): boolean {
  const o = normRoute(origin);
  const d = normRoute(dest);
  return outgoing.some(
    (r) =>
      r.status === "pending" &&
      r.direction === "invitation" &&
      r.requestedByUserId === viewerId &&
      r.driverId === viewerId &&
      r.passengerId === passengerId &&
      normRoute(r.originText ?? "") === o &&
      normRoute(r.destinationText ?? "") === d
  );
}

function defaultPreferredTimeForSuggestion(s: Suggestion): string {
  if (s.kind === "trip") {
    return preferredTimeFromDeparture(s.timeLabel);
  }
  const t = s.timeLabel.trim();
  return t || "08:00";
}

export default function SmartMatches() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const { playSmartMatchNew } = useSound();
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );
  const [currentUserId, setCurrentUserId] = useState("");
  const [prefs, setPrefs] = useState<MatchPref[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lastNewNotifiedKeys, setLastNewNotifiedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outgoingTripRequests, setOutgoingTripRequests] = useState<
    OutgoingTripRequest[]
  >([]);
  const [ppRelationships, setPpRelationships] = useState<{
    asDriver: PpRelationship[];
    asPassenger: PpRelationship[];
  }>({ asDriver: [], asPassenger: [] });
  const [ppOutgoing, setPpOutgoing] = useState<PpRequest[]>([]);
  const [joiningTripId, setJoiningTripId] = useState<string | null>(null);
  const [openingChatTripId, setOpeningChatTripId] = useState<string | null>(
    null
  );
  const [joinSuccessOpen, setJoinSuccessOpen] = useState(false);
  const [joinSuccessTripId, setJoinSuccessTripId] = useState<string | null>(
    null
  );
  const [ppFollowUpOpen, setPpFollowUpOpen] = useState(false);
  const [ppModalSuggestion, setPpModalSuggestion] = useState<Suggestion | null>(
    null
  );

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
      setCurrentUserId("");
      setOutgoingTripRequests([]);
      setPpRelationships({ asDriver: [], asPassenger: [] });
      setPpOutgoing([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [me, pr, su, outReq, ppRel, ppOut] = await Promise.all([
        getCurrentUser().catch(() => null),
        fetch(`${API_BASE_URL}/api/match-preferences`, {
          headers: { Authorization: `Bearer ${tok}` },
        }),
        fetch(`${API_BASE_URL}/api/match-suggestions`, {
          headers: { Authorization: `Bearer ${tok}` },
        }),
        fetch(`${API_BASE_URL}/api/trip-requests/outgoing`, {
          headers: { Authorization: `Bearer ${tok}` },
        }).then(async (r) => {
          const data = await r.json();
          if (!r.ok) return [];
          return Array.isArray(data.requests)
            ? (data.requests as OutgoingTripRequest[])
            : [];
        }),
        fetchPpRelationships().catch(() => ({
          asDriver: [] as PpRelationship[],
          asPassenger: [] as PpRelationship[],
        })),
        fetchPpOutgoing().catch(() => ({ requests: [] as PpRequest[] })),
      ]);
      setCurrentUserId(me?.id ?? "");
      setOutgoingTripRequests(outReq);
      setPpRelationships(ppRel);
      setPpOutgoing(
        Array.isArray(ppOut.requests) ? ppOut.requests : []
      );
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
      setCurrentUserId("");
      setOutgoingTripRequests([]);
      setPpRelationships({ asDriver: [], asPassenger: [] });
      setPpOutgoing([]);
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

  async function joinTripFromSuggestion(tripId: string) {
    const tok = localStorage.getItem("token");
    if (!tok) {
      alert(t("smartMatch.login"));
      return;
    }
    try {
      setJoiningTripId(tripId);
      const response = await fetch(`${API_BASE_URL}/api/trip-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({ tripId, seatsRequested: 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(messageFromApiError(data, t, "tripDetails.joinError"));
        return;
      }
      setJoinSuccessTripId(tripId);
      setJoinSuccessOpen(true);
      await load();
      await refreshNotificationCounts();
    } catch {
      alert(t("smartMatch.errors.network"));
    } finally {
      setJoiningTripId(null);
    }
  }

  async function openChatForTrip(tripId: string) {
    const tok = localStorage.getItem("token");
    if (!tok) {
      alert(t("smartMatch.login"));
      return;
    }
    try {
      setOpeningChatTripId(tripId);
      const res = await fetch(
        `${API_BASE_URL}/api/trip-chats/by-trip/${tripId}`,
        { method: "POST", headers: { Authorization: `Bearer ${tok}` } }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(messageFromApiError(data, t, "tripDetails.createChatError"));
        return;
      }
      const chatId = (data as { chat?: { id?: string } }).chat?.id;
      if (chatId) window.location.href = `/chat/${chatId}`;
    } catch {
      alert(t("smartMatch.errors.network"));
    } finally {
      setOpeningChatTripId(null);
    }
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
    <div className="min-h-screen overflow-hidden bg-[#eef4f8] text-[#193549]">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#a9df74_0%,#59c7df_18%,#eef8ff_42%,#f9fcff_58%,#e9f7e1_76%,#b8e07d_100%)]" />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 h-[220px] w-[120%] -translate-x-1/2 rounded-b-[50%] bg-white/45 blur-xl" />
          <div className="absolute top-24 left-[8%] h-28 w-28 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute top-20 right-[10%] h-24 w-24 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-36 left-[-8%] h-56 w-72 rounded-full bg-[#b6e86f]/35 blur-3xl" />
          <div className="absolute bottom-24 right-[-6%] h-56 w-72 rounded-full bg-[#8fdf79]/35 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-10">
          <AppPageHeader>
            <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <a href="/trips" className="gomate-nav-pill font-medium">
                {t("nav.trips")}
              </a>
              <a href="/templates" className="gomate-nav-pill font-medium">
                {t("nav.templates")}
              </a>
            </nav>
          </AppPageHeader>

          <motion.div
            className="mx-auto w-full max-w-4xl space-y-6"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.h1
              variants={staggerItemVariants}
              className="text-3xl font-extrabold tracking-tight text-[#173651] sm:text-4xl"
            >
              {t("smartMatch.pageTitle")}
            </motion.h1>
            <motion.section
              variants={staggerItemVariants}
              className="gomate-glass-panel p-5 sm:p-6"
            >
              <h2 className="text-xl font-extrabold tracking-tight text-[#173651] sm:text-2xl">
                {t("smartMatch.heroTitle")}
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#4a6678] sm:text-base">
                {t("smartMatch.heroBody")}
              </p>
            </motion.section>

            {!token ? (
              <motion.p
                variants={staggerItemVariants}
                className="gomate-alert-neutral text-[15px] leading-relaxed sm:text-base"
              >
                {t("smartMatch.loginHint")}{" "}
                <a href="/login" className="font-semibold text-[#1296e8] underline decoration-[#1296e8]/40 underline-offset-2 transition hover:text-[#0d7bc4]">
                  {t("nav.login")}
                </a>
              </motion.p>
            ) : null}

            {token ? (
              <>
                <motion.section
                  variants={staggerItemVariants}
                  className="gomate-glass-panel p-5 sm:p-6"
                >
                  <h3 className="text-lg font-extrabold tracking-tight text-[#173651]">
                    {t("smartMatch.formTitle")}
                  </h3>
                  <form className="mt-5 space-y-5" onSubmit={handleCreate}>
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
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                              weekdays.includes(d)
                                ? "bg-[#163c59] text-white ring-1 ring-[#1f4d73]/30"
                                : "bg-white/90 text-[#4a6678] ring-1 ring-white/90 shadow-[0_6px_18px_rgba(23,54,81,0.06)]"
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
                  className="gomate-glass-panel p-5 sm:p-6"
                >
                  <h3 className="text-lg font-extrabold tracking-tight text-[#173651]">
                    {t("smartMatch.prefsTitle")}
                  </h3>
                  {loading ? (
                    <p className="mt-4 text-sm text-[#4a6678]">{t("smartMatch.loading")}</p>
                  ) : prefs.length === 0 ? (
                    <p className="mt-4 text-sm leading-relaxed text-[#4a6678]">
                      {t("smartMatch.prefsEmpty")}
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-4">
                      {prefs.map((p) => (
                        <li
                          key={p.id}
                          className="gomate-lift-card p-4 text-sm backdrop-blur-sm"
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

                <motion.section
                  variants={staggerItemVariants}
                  className="gomate-glass-panel p-5 sm:p-6"
                >
                  <h3 className="text-lg font-extrabold tracking-tight text-[#173651]">
                    {t("smartMatch.suggestionsTitle")}
                  </h3>
                  {loading ? (
                    <p className="mt-4 text-sm text-[#4a6678]">{t("smartMatch.loading")}</p>
                  ) : suggestions.length === 0 ? (
                    <p className="mt-4 text-sm leading-relaxed text-[#4a6678]">
                      {t("smartMatch.suggestionsEmpty")}
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-4">
                      {suggestions.map((s) => {
                        const tripActive =
                          s.kind === "trip" && s.tripId
                            ? getActiveOutgoingForTrip(
                                outgoingTripRequests,
                                s.tripId
                              )
                            : null;
                        const tplConnected =
                          s.kind === "template" && currentUserId
                            ? hasActivePpBetween(
                                ppRelationships,
                                currentUserId,
                                s.otherUserId,
                                s.origin,
                                s.destination
                              )
                            : false;
                        const tplPending =
                          s.kind === "template" &&
                          s.templateId &&
                          currentUserId
                            ? hasPendingPpTemplateRequest(
                                ppOutgoing,
                                currentUserId,
                                s.otherUserId,
                                s.templateId,
                                s.origin,
                                s.destination
                              )
                            : false;
                        const passConnected =
                          s.kind === "passenger_preference" && currentUserId
                            ? hasActivePpBetween(
                                ppRelationships,
                                currentUserId,
                                s.otherUserId,
                                s.origin,
                                s.destination
                              )
                            : false;
                        const passPending =
                          s.kind === "passenger_preference" && currentUserId
                            ? hasPendingPpInvitation(
                                ppOutgoing,
                                currentUserId,
                                s.otherUserId,
                                s.origin,
                                s.destination
                              )
                            : false;
                        const seatsOk =
                          s.kind !== "trip" || (s.availableSeats ?? 0) >= 1;

                        return (
                          <li
                            key={s.id}
                            className={`gomate-lift-card p-4 backdrop-blur-sm ${
                              s.isNew
                                ? "border-[#1296e8]/50 bg-[linear-gradient(135deg,rgba(18,150,232,0.08)_0%,rgba(255,255,255,0.78)_58%)] shadow-[0_18px_48px_rgba(18,150,232,0.14)] ring-1 ring-[#1296e8]/30"
                                : ""
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
                                  {t("smartMatch.withUser", {
                                    name: s.otherUserName,
                                  })}
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

                            <div className="mt-4 flex flex-col gap-3">
                              {s.kind === "trip" && s.tripId ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={
                                      joiningTripId === s.tripId ||
                                      tripActive?.status === "pending" ||
                                      tripActive?.status === "accepted" ||
                                      !seatsOk
                                    }
                                    onClick={() =>
                                      void joinTripFromSuggestion(s.tripId!)
                                    }
                                    className="gomate-btn-gradient flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {joiningTripId === s.tripId
                                      ? t("smartMatch.primary.joining")
                                      : tripActive?.status === "pending"
                                        ? t("smartMatch.primary.requestPending")
                                        : tripActive?.status === "accepted"
                                          ? t("smartMatch.primary.seatConfirmed")
                                          : !seatsOk
                                            ? t("smartMatch.primary.noSeats")
                                            : t("smartMatch.primary.joinTrip")}
                                  </button>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                    <button
                                      type="button"
                                      disabled={openingChatTripId === s.tripId}
                                      onClick={() =>
                                        void openChatForTrip(s.tripId!)
                                      }
                                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/90 bg-white/90 px-4 text-sm font-bold text-[#163c59] shadow-sm disabled:opacity-60"
                                    >
                                      {openingChatTripId === s.tripId
                                        ? t("tripDetails.chatOpening")
                                        : t("smartMatch.secondary.openChat")}
                                    </button>
                                    <a
                                      href={`/trips/${s.tripId}`}
                                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-[#163c59]/30 bg-white/80 px-4 text-sm font-bold text-[#163c59] shadow-sm"
                                    >
                                      {t("smartMatch.secondary.viewDetails")}
                                    </a>
                                    <button
                                      type="button"
                                      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/90 bg-white/88 px-4 text-sm font-bold text-[#4a6678] shadow-sm"
                                      onClick={() => void dismissSuggestion(s)}
                                    >
                                      {t("smartMatch.dismiss")}
                                    </button>
                                  </div>
                                </>
                              ) : null}

                              {s.kind === "template" ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={
                                      tplConnected || tplPending || !s.templateId
                                    }
                                    onClick={() => setPpModalSuggestion(s)}
                                    className="gomate-btn-gradient flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {tplConnected
                                      ? t("smartMatch.primary.connected")
                                      : tplPending
                                        ? t("smartMatch.primary.ppPending")
                                        : t("smartMatch.primary.requestRegular")}
                                  </button>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                    <a
                                      href="/trips"
                                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/90 bg-white/90 px-4 text-sm font-bold text-[#163c59] shadow-sm"
                                    >
                                      {t("smartMatch.secondary.browseTrips")}
                                    </a>
                                    <button
                                      type="button"
                                      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/90 bg-white/88 px-4 text-sm font-bold text-[#4a6678] shadow-sm"
                                      onClick={() => void dismissSuggestion(s)}
                                    >
                                      {t("smartMatch.dismiss")}
                                    </button>
                                  </div>
                                </>
                              ) : null}

                              {s.kind === "passenger_preference" ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={passConnected || passPending}
                                    onClick={() => setPpModalSuggestion(s)}
                                    className="gomate-btn-gradient flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {passConnected
                                      ? t("smartMatch.primary.connected")
                                      : passPending
                                        ? t("smartMatch.primary.ppPending")
                                        : t("smartMatch.primary.invitePassenger")}
                                  </button>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                    <a
                                      href="/permanent-passengers"
                                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/90 bg-white/90 px-4 text-sm font-bold text-[#163c59] shadow-sm"
                                    >
                                      {t("smartMatch.secondary.manageRegular")}
                                    </a>
                                    <button
                                      type="button"
                                      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/90 bg-white/88 px-4 text-sm font-bold text-[#4a6678] shadow-sm"
                                      onClick={() => void dismissSuggestion(s)}
                                    >
                                      {t("smartMatch.dismiss")}
                                    </button>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </motion.section>
              </>
            ) : null}
          </motion.div>

          <JoinRequestSuccessModal
            open={joinSuccessOpen}
            onClose={() => {
              setJoinSuccessOpen(false);
              setJoinSuccessTripId(null);
            }}
            onViewRequests={() => {
              navigate("/requests");
            }}
            smartMatchFollowUp={
              joinSuccessTripId
                ? {
                    tripId: joinSuccessTripId,
                    onOpenChat: () => {
                      const id = joinSuccessTripId;
                      setJoinSuccessOpen(false);
                      setJoinSuccessTripId(null);
                      void openChatForTrip(id);
                    },
                  }
                : null
            }
          />
          <RegularRideRequestSuccessModal
            open={ppFollowUpOpen}
            onClose={() => setPpFollowUpOpen(false)}
            onViewRegularRides={() => navigate("/permanent-passengers")}
          />
          <PermanentPassengerModal
            open={ppModalSuggestion !== null}
            onClose={() => setPpModalSuggestion(null)}
            direction={
              ppModalSuggestion?.kind === "template" ? "request" : "invitation"
            }
            targetUserId={ppModalSuggestion?.otherUserId ?? ""}
            targetDisplayName={ppModalSuggestion?.otherUserName}
            defaultWeekdays={ppModalSuggestion?.weekdays}
            defaultPreferredTime={
              ppModalSuggestion
                ? defaultPreferredTimeForSuggestion(ppModalSuggestion)
                : ""
            }
            tripId={null}
            templateId={
              ppModalSuggestion?.kind === "template"
                ? ppModalSuggestion.templateId ?? null
                : null
            }
            originText={ppModalSuggestion?.origin ?? null}
            destinationText={ppModalSuggestion?.destination ?? null}
            onSuccess={() => {
              void load();
              window.setTimeout(() => setPpFollowUpOpen(true), 700);
            }}
          />
        </div>
      </div>
    </div>
  );
}
