import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { API_BASE_URL } from "../../lib/api";
import { useTranslation } from "../../i18n";
import {
  reviewModalBackdropVariants,
  reviewModalEase,
  reviewModalPanelVariants,
} from "../../lib/motionVariants";
import { useSound } from "../../context/SoundContext";
import { MatchConnectionIllustration } from "./MatchConnectionIllustration";

export type RideMatchModalPayload = {
  requestId: string;
  tripId: string;
  origin: string;
  destination: string;
  driverName: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  payload: RideMatchModalPayload | null;
};

export function RideMatchModal({ open, onClose, payload }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { playClick, playModalOpenSoft } = useSound();
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!open || !payload) {
      setChatId(null);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setChatId(null);
      return;
    }

    let cancelled = false;
    setChatLoading(true);

    void (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/trip-chats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => null)) as {
          chats?: { id: string; tripId: string }[];
        } | null;
        if (!res.ok || !data || !Array.isArray(data.chats)) {
          if (!cancelled) setChatId(null);
          return;
        }
        const hit = data.chats.find((c) => c.tripId === payload.tripId);
        if (!cancelled) setChatId(hit?.id ?? null);
      } catch {
        if (!cancelled) setChatId(null);
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, payload]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    window.setTimeout(() => el?.focus(), 60);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !payload) return;
    const id = requestAnimationFrame(() => playModalOpenSoft());
    return () => cancelAnimationFrame(id);
  }, [open, payload, playModalOpenSoft]);

  const routeLabel =
    payload && payload.origin && payload.destination
      ? `${payload.origin} → ${payload.destination}`
      : "";

  return (
    <AnimatePresence>
      {open && payload ? (
        <motion.div
          className="fixed inset-0 z-[175] flex items-end justify-center sm:items-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={reviewModalBackdropVariants}
          transition={reviewModalEase}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0b1f2c]/45 backdrop-blur-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
            aria-label={t("rideMatch.a11yClose")}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="relative z-10 m-0 w-full max-w-md rounded-t-[28px] border border-white/75 bg-gradient-to-b from-white/98 to-[#f6fbfd]/98 p-5 shadow-[0_32px_90px_rgba(23,54,81,0.22)] backdrop-blur-md sm:m-4 sm:rounded-[28px] sm:p-8"
            variants={reviewModalPanelVariants}
            transition={reviewModalEase}
          >
            <div className="text-center">
              <h2
                id={titleId}
                className="text-[1.28rem] font-extrabold leading-snug tracking-tight text-[#173651] sm:text-2xl"
              >
                {t("rideMatch.title")}
              </h2>
              <p
                id={descId}
                className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#4a6678]"
              >
                {t("rideMatch.subtitle", {
                  route: routeLabel,
                  driver: payload.driverName,
                })}
              </p>
            </div>

            <div className="relative mt-5 flex min-h-[128px] items-center justify-center sm:min-h-[132px]">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[10rem] w-[18rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(18,150,232,0.12)_0%,rgba(138,218,51,0.08)_40%,transparent_72%)]"
                aria-hidden
              />
              <div className="relative z-[1] w-full px-1">
                <MatchConnectionIllustration
                  driverLabel={t("rideMatch.roleDriver")}
                  passengerLabel={t("rideMatch.roleYou")}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
              {chatId ? (
                <a
                  href={`/chat/${chatId}`}
                  onClick={() => playClick()}
                  className="flex min-h-[3rem] w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-5 text-sm font-bold text-white shadow-[0_10px_26px_rgba(39,149,119,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6fbfd] sm:w-auto sm:min-w-[10.5rem]"
                >
                  {t("rideMatch.openChat")}
                </a>
              ) : (
                <span className="block w-full text-center text-xs text-[#6d8494] sm:min-w-[10.5rem]">
                  {chatLoading ? t("rideMatch.chatLoading") : t("rideMatch.chatUnavailable")}
                </span>
              )}

              <a
                href={`/trips/${payload.tripId}`}
                onClick={() => playClick()}
                className="flex min-h-[3rem] w-full items-center justify-center rounded-full border border-[#cfe6f3] bg-white/90 px-5 text-sm font-semibold text-[#29485d] shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6fbfd] sm:w-auto sm:min-w-[10.5rem]"
              >
                {t("rideMatch.viewTrip")}
              </a>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  onClose();
                }}
                className="flex min-h-[3rem] w-full items-center justify-center rounded-full bg-[#163c59] px-5 text-sm font-bold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6fbfd] sm:w-auto sm:min-w-[10.5rem]"
              >
                {t("rideMatch.ok")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
