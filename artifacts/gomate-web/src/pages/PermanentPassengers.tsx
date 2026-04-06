import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppPageHeader } from "../components/AppPageHeader";
import { getCurrentUser } from "../lib/auth";
import { useTranslation } from "../i18n";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { messageFromApiError } from "../lib/errorMessages";
import { messageFromApiSuccess } from "../lib/successMessages";
import {
  acceptPpRequest,
  cancelPpRequest,
  endPpRelationship,
  fetchPpIncoming,
  fetchPpOutgoing,
  fetchPpRelationships,
  localCalendarYmd,
  registerPpSkip,
  rejectPpRequest,
  type PpRelationship,
  type PpRequest,
} from "../lib/permanentPassengersApi";
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "../lib/motionVariants";

type CurrentUserLike = { id?: string; userId?: string; name?: string };

const WEEK_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function formatWeekdays(
  weekdays: string[] | null | undefined,
  tr: (k: string) => string
): string {
  if (!weekdays?.length) return "";
  const sorted = [...weekdays].sort(
    (a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)
  );
  return sorted.map((d) => tr(`weekday.${d}`)).join(", ");
}

function renderStars(rating: number) {
  const safe = Math.max(0, Math.min(5, rating));
  return Array.from({ length: 5 }, (_, i) => (i < safe ? "★" : "☆")).join(" ");
}

export default function PermanentPassengers() {
  const { t } = useTranslation();
  const { reviewTasksPending } = useNotificationCounts();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [incoming, setIncoming] = useState<PpRequest[]>([]);
  const [outgoing, setOutgoing] = useState<PpRequest[]>([]);
  const [asDriver, setAsDriver] = useState<PpRelationship[]>([]);
  const [asPassenger, setAsPassenger] = useState<PpRelationship[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [inc, out, rel] = await Promise.all([
        fetchPpIncoming(),
        fetchPpOutgoing(),
        fetchPpRelationships(),
      ]);
      setIncoming(inc.requests ?? []);
      setOutgoing(out.requests ?? []);
      setAsDriver(rel.asDriver ?? []);
      setAsPassenger(rel.asPassenger ?? []);
      setMessage("");
    } catch (e: unknown) {
      const data = e as { errorCode?: string };
      setError(messageFromApiError(data, t, "ppPage.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void (async () => {
      const u = (await getCurrentUser()) as CurrentUserLike | null;
      if (!u) {
        window.location.href = "/login";
        return;
      }
      await loadAll();
    })();
  }, [loadAll]);

  const pendingOutgoing = useMemo(
    () => outgoing.filter((r) => r.status === "pending"),
    [outgoing]
  );

  const pastOutgoing = useMemo(
    () => outgoing.filter((r) => r.status !== "pending"),
    [outgoing]
  );

  async function onAccept(id: string) {
    setBusyId(id);
    setError("");
    try {
      const data = await acceptPpRequest(id);
      setMessage(messageFromApiSuccess(data as { messageCode?: string }, t, "ppPage.accepted"));
      await loadAll();
    } catch (e: unknown) {
      setError(messageFromApiError(e as { errorCode?: string }, t, "ppPage.actionError"));
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    if (!window.confirm(t("ppPage.confirmReject"))) return;
    setBusyId(id);
    setError("");
    try {
      const data = await rejectPpRequest(id);
      setMessage(messageFromApiSuccess(data as { messageCode?: string }, t, "ppPage.rejected"));
      await loadAll();
    } catch (e: unknown) {
      setError(messageFromApiError(e as { errorCode?: string }, t, "ppPage.actionError"));
    } finally {
      setBusyId(null);
    }
  }

  async function onCancel(id: string) {
    if (!window.confirm(t("ppPage.confirmCancel"))) return;
    setBusyId(id);
    setError("");
    try {
      const data = await cancelPpRequest(id);
      setMessage(messageFromApiSuccess(data as { messageCode?: string }, t, "ppPage.cancelled"));
      await loadAll();
    } catch (e: unknown) {
      setError(messageFromApiError(e as { errorCode?: string }, t, "ppPage.actionError"));
    } finally {
      setBusyId(null);
    }
  }

  async function onEnd(relId: string) {
    if (!window.confirm(t("ppPage.confirmEnd"))) return;
    setBusyId(relId);
    setError("");
    try {
      const data = await endPpRelationship(relId);
      setMessage(messageFromApiSuccess(data as { messageCode?: string }, t, "ppPage.ended"));
      await loadAll();
    } catch (e: unknown) {
      setError(messageFromApiError(e as { errorCode?: string }, t, "ppPage.actionError"));
    } finally {
      setBusyId(null);
    }
  }

  async function onSkipToday(relId: string) {
    setBusyId(relId);
    setError("");
    try {
      const data = await registerPpSkip(relId, localCalendarYmd());
      setMessage(messageFromApiSuccess(data as { messageCode?: string }, t, "ppPage.skipDone"));
      await loadAll();
    } catch (e: unknown) {
      setError(messageFromApiError(e as { errorCode?: string }, t, "ppPage.actionError"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#eef4f8] pb-24">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
        <AppPageHeader>
          <nav className="hidden flex-wrap items-center gap-2 md:flex md:gap-3">
            <a href="/" className="gomate-nav-pill">
              {t("nav.home")}
            </a>
            <a href="/trips" className="gomate-nav-pill">
              {t("nav.trips")}
            </a>
            <a href="/permanent-passengers" className="gomate-nav-pill-dark">
              {t("nav.permanentPassengers")}
            </a>
            <a href="/profile" className="gomate-nav-pill">
              {t("nav.profile")}
            </a>
            {reviewTasksPending > 0 ? (
              <span className="gomate-badge-reviews">
                {t("nav.badge.reviewsPending", { count: reviewTasksPending })}
              </span>
            ) : null}
          </nav>
        </AppPageHeader>

        <motion.div
          className="mt-6"
          initial="hidden"
          animate="show"
          variants={staggerContainerVariants}
        >
          <motion.div variants={staggerItemVariants} className="gomate-glass-hero">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6f8798]">
                  {t("ppPage.kicker")}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#173651] sm:text-4xl">
                  {t("ppPage.title")}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#4a6678]">
                  {t("ppPage.subtitle")}
                </p>
              </div>
              <a
                href="/trips"
                className="gomate-btn-secondary inline-flex w-full shrink-0 justify-center sm:w-auto"
              >
                {t("ppPage.browseTrips")}
              </a>
            </div>
          </motion.div>

          {message ? (
            <motion.div variants={staggerItemVariants} className="gomate-alert-success mt-5">
              {message}
            </motion.div>
          ) : null}
          {error ? (
            <motion.div variants={staggerItemVariants} className="gomate-alert-error mt-5">
              {error}
            </motion.div>
          ) : null}

          {loading ? (
            <motion.p variants={staggerItemVariants} className="mt-8 text-sm text-[#35556c]">
              {t("ppPage.loading")}
            </motion.p>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <motion.section variants={staggerItemVariants} className="space-y-4">
                <h2 className="text-lg font-extrabold text-[#173651]">
                  {t("ppPage.section.incoming")}
                </h2>
                {incoming.length === 0 ? (
                  <div className="gomate-empty-state">
                    <p className="text-sm font-semibold text-[#35556c]">
                      {t("ppPage.empty.incoming.title")}
                    </p>
                    <p className="text-sm text-[#5a7389]">{t("ppPage.empty.incoming.body")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incoming.map((r) => {
                      const other =
                        r.direction === "request" ? r.passenger : r.driver;
                      const badge =
                        r.direction === "request"
                          ? t("ppPage.badge.passengerRequest")
                          : t("ppPage.badge.driverInvite");
                      return (
                        <div key={r.id} className="gomate-glass-panel">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="gomate-chip-warn">{badge}</span>
                            <span className="text-xs font-semibold text-[#5a7389]">
                              {t("ppPage.pending")}
                            </span>
                          </div>
                          <div className="mt-3 text-lg font-extrabold text-[#173651]">
                            {other?.name ?? t("ppPage.userFallback")}
                          </div>
                          <div className="mt-1 text-sm text-[#f4b400]">
                            {renderStars(other?.rating ?? 0)}
                            <span className="ml-2 text-[#4a6678]">
                              {other?.rating ?? 0} {t("tripDetails.outOf5")}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[#4a6678]">
                            <span className="font-semibold">{t("ppPage.days")}</span>{" "}
                            {formatWeekdays(r.weekdays, t)}
                          </p>
                          {r.preferredTime ? (
                            <p className="mt-1 text-sm text-[#4a6678]">
                              <span className="font-semibold">{t("ppPage.preferredTime")}</span>{" "}
                              {r.preferredTime}
                            </p>
                          ) : null}
                          {r.note ? (
                            <p className="mt-2 rounded-2xl border border-[#d7e4eb] bg-white/80 px-3 py-2 text-sm text-[#35556c]">
                              {r.note}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => void onAccept(r.id)}
                              className="rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                            >
                              {busyId === r.id ? t("ppPage.working") : t("ppPage.accept")}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => void onReject(r.id)}
                              className="rounded-full border border-white/90 bg-white px-5 py-2.5 text-sm font-bold text-[#c62828] shadow-sm disabled:opacity-60"
                            >
                              {t("ppPage.reject")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.section>

              <motion.section variants={staggerItemVariants} className="space-y-4">
                <h2 className="text-lg font-extrabold text-[#173651]">
                  {t("ppPage.section.outgoing")}
                </h2>
                {pendingOutgoing.length === 0 ? (
                  <div className="gomate-empty-state">
                    <p className="text-sm font-semibold text-[#35556c]">
                      {t("ppPage.empty.outgoing.title")}
                    </p>
                    <p className="text-sm text-[#5a7389]">{t("ppPage.empty.outgoing.body")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingOutgoing.map((r) => {
                      const other =
                        r.direction === "request" ? r.driver : r.passenger;
                      return (
                        <div key={r.id} className="gomate-glass-panel">
                          <span className="gomate-chip-route">{t("ppPage.badge.pendingYours")}</span>
                          <div className="mt-3 text-lg font-extrabold text-[#173651]">
                            {other?.name ?? t("ppPage.userFallback")}
                          </div>
                          <p className="mt-2 text-sm text-[#4a6678]">
                            {formatWeekdays(r.weekdays, t)}
                          </p>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void onCancel(r.id)}
                            className="mt-4 rounded-full border border-white/90 bg-white px-5 py-2.5 text-sm font-bold text-[#29485d] shadow-sm disabled:opacity-60"
                          >
                            {busyId === r.id ? t("ppPage.working") : t("ppPage.cancelRequest")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {pastOutgoing.length > 0 ? (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-sm font-extrabold text-[#35556c]">
                      {t("ppPage.section.history")}
                    </h3>
                    <ul className="space-y-2 text-sm text-[#5a7389]">
                      {pastOutgoing.slice(0, 6).map((r) => (
                        <li key={r.id} className="rounded-2xl border border-white/70 bg-white/55 px-3 py-2">
                          <span className="font-semibold text-[#29485d]">{r.status}</span>
                          <span className="mx-2 text-[#b8c9d6]">·</span>
                          {formatWeekdays(r.weekdays, t)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </motion.section>

              <motion.section variants={staggerItemVariants} className="space-y-4 lg:col-span-2">
                <div className="grid gap-8 lg:grid-cols-2">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#173651]">
                      {t("ppPage.section.myDrivers")}
                    </h2>
                    {asPassenger.length === 0 ? (
                      <div className="gomate-empty-state mt-3">
                        <p className="text-sm font-semibold text-[#35556c]">
                          {t("ppPage.empty.drivers.title")}
                        </p>
                        <p className="text-sm text-[#5a7389]">{t("ppPage.empty.drivers.body")}</p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {asPassenger.map((rel) => (
                          <RelationshipCard
                            key={rel.id}
                            rel={rel}
                            role="passenger"
                            busyId={busyId}
                            onEnd={onEnd}
                            onSkip={onSkipToday}
                            t={t}
                            formatWeekdays={formatWeekdays}
                            renderStars={renderStars}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg font-extrabold text-[#173651]">
                      {t("ppPage.section.myPassengers")}
                    </h2>
                    {asDriver.length === 0 ? (
                      <div className="gomate-empty-state mt-3">
                        <p className="text-sm font-semibold text-[#35556c]">
                          {t("ppPage.empty.passengers.title")}
                        </p>
                        <p className="text-sm text-[#5a7389]">{t("ppPage.empty.passengers.body")}</p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {asDriver.map((rel) => (
                          <RelationshipCard
                            key={rel.id}
                            rel={rel}
                            role="driver"
                            busyId={busyId}
                            onEnd={onEnd}
                            onSkip={onSkipToday}
                            t={t}
                            formatWeekdays={formatWeekdays}
                            renderStars={renderStars}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>
            </div>
          )}
        </motion.div>
      </div>

    </div>
  );
}

function RelationshipCard({
  rel,
  role,
  busyId,
  onEnd,
  onSkip,
  t,
  formatWeekdays,
  renderStars,
}: {
  rel: PpRelationship;
  role: "driver" | "passenger";
  busyId: string | null;
  onEnd: (id: string) => void;
  onSkip: (id: string) => void;
  t: (k: string) => string;
  formatWeekdays: (w: string[] | null | undefined, tr: (k: string) => string) => string;
  renderStars: (n: number) => string;
}) {
  const counterparty = role === "passenger" ? rel.driver : rel.passenger;
  const route =
    rel.originText && rel.destinationText
      ? `${rel.originText} → ${rel.destinationText}`
      : "";

  return (
    <div className="gomate-glass-panel">
      <div className="flex flex-wrap items-center gap-2">
        <span className="gomate-chip-success">
          {role === "passenger" ? t("ppPage.badge.regularDriver") : t("ppPage.badge.regularPassenger")}
        </span>
        <span className="text-xs font-semibold text-[#5a7389]">{t("ppPage.active")}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {counterparty?.avatarUrl ? (
          <img
            src={counterparty.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover ring-2 ring-white/80"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-sm font-extrabold text-white">
            {(counterparty?.name ?? "G").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-lg font-extrabold text-[#173651]">
            {counterparty?.name ?? t("ppPage.userFallback")}
          </div>
          <div className="text-sm text-[#f4b400]">
            {renderStars(counterparty?.rating ?? 0)}
          </div>
        </div>
      </div>

      {route ? <p className="mt-2 text-sm text-[#4a6678]">{route}</p> : null}

      <p className="mt-2 text-sm text-[#4a6678]">
        <span className="font-semibold">{t("ppPage.days")}</span>{" "}
        {formatWeekdays(rel.weekdays, t)}
      </p>
      {rel.preferredTime ? (
        <p className="mt-1 text-sm text-[#4a6678]">
          <span className="font-semibold">{t("ppPage.preferredTime")}</span> {rel.preferredTime}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busyId === rel.id}
          onClick={() => onSkip(rel.id)}
          className="rounded-full border border-white/90 bg-white px-5 py-2.5 text-sm font-bold text-[#29485d] shadow-sm disabled:opacity-60"
        >
          {busyId === rel.id ? t("ppPage.working") : t("ppPage.skipToday")}
        </button>
        <button
          type="button"
          disabled={busyId === rel.id}
          onClick={() => onEnd(rel.id)}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#c62828] shadow-sm ring-1 ring-[#f0bcbc]/80 disabled:opacity-60"
        >
          {t("ppPage.endRelationship")}
        </button>
      </div>
    </div>
  );
}
