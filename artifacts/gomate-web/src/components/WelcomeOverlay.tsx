import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSound } from "../context/SoundContext";
import { useTranslation } from "../i18n";

const SESSION_OVERLAY_KEY = "gomate-welcome-overlay-shown-v1";

function overlayAlreadyShown(): boolean {
  try {
    return sessionStorage.getItem(SESSION_OVERLAY_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Short branded welcome on first entry in a browser tab session.
 * Sound: respects global UI sound + reduced motion; retries after first gesture if autoplay blocks.
 */
export function WelcomeOverlay() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { playWelcomeOpening } = useSound();
  const [visible, setVisible] = useState(() => !overlayAlreadyShown());
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      sessionStorage.setItem(SESSION_OVERLAY_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    playWelcomeOpening();
    const retry = () => {
      requestAnimationFrame(() => playWelcomeOpening());
    };
    window.addEventListener("pointerdown", retry, { once: true, passive: true });
    window.addEventListener("touchstart", retry, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("touchstart", retry);
    };
  }, [visible, playWelcomeOpening]);

  useEffect(() => {
    if (!visible || phase !== "enter") return;
    const ms = reduce ? 720 : 1980;
    const id = window.setTimeout(() => setPhase("exit"), ms);
    return () => window.clearTimeout(id);
  }, [visible, phase, reduce]);

  useEffect(() => {
    if (phase !== "exit") return;
    const id = window.setTimeout(() => {
      dismiss();
    }, 480);
    return () => window.clearTimeout(id);
  }, [phase, dismiss]);

  const requestExit = useCallback(() => {
    setPhase("exit");
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[190] flex flex-col items-center justify-center overflow-hidden bg-[linear-gradient(165deg,#a9df74_0%,#59c7df_22%,#eef8ff_52%,#f9fcff_78%,#e9f7e1_100%)] px-6"
      role="region"
      aria-label={t("welcome.opening.a11yRegion")}
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "exit" ? 0 : 1 }}
      transition={{
        duration: phase === "exit" ? 0.42 : reduce ? 0.18 : 0.42,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[20%] top-1/4 h-48 w-48 rounded-full bg-white/35 blur-3xl" />
        <div className="absolute -right-[15%] bottom-1/3 h-56 w-56 rounded-full bg-[#8ada33]/25 blur-3xl" />
      </div>

      <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5"
        >
          <img
            src="/gomate-logo.png"
            alt=""
            className="mx-auto h-16 w-auto drop-shadow-[0_12px_32px_rgba(23,54,81,0.12)] sm:h-20"
            draggable={false}
          />
        </motion.div>

        <motion.h1
          className="text-balance font-extrabold tracking-tight text-[#173651] drop-shadow-sm"
          style={{ fontSize: "clamp(1.35rem, 4.2vw, 1.75rem)" }}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {t("welcome.opening.title")}
        </motion.h1>

        <motion.p
          className="mt-2 max-w-sm text-pretty text-sm font-semibold leading-snug text-[#3d5a6e] sm:text-base"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {t("welcome.opening.subtitle")}
        </motion.p>

        {!reduce ? (
          <motion.div
            className="mt-8 h-1 w-28 rounded-full bg-gradient-to-r from-transparent via-[#1296e8]/35 to-transparent"
            initial={{ opacity: 0, scaleX: 0.6 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={requestExit}
        className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom,0px)+1rem)] left-1/2 z-[2] -translate-x-1/2 rounded-full border border-white/80 bg-white/80 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#28475d] shadow-[0_10px_28px_rgba(23,54,81,0.12)] backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-safe:active:scale-[0.98] sm:text-sm"
      >
        {t("welcome.opening.skip")}
      </button>
    </motion.div>
  );
}
