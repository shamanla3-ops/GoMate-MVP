import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSound } from "../context/SoundContext";
import { useTranslation } from "../i18n";

const SESSION_OVERLAY_KEY = "gomate-welcome-overlay-shown-v1";

/** Hold before exit: tuned so total visible ~2.9–3.8s + exit (full motion). */
const HOLD_MS_FULL = 2720;
const HOLD_MS_REDUCE = 1420;
const EXIT_MS_FULL = 0.62;
const EXIT_MS_REDUCE = 0.32;
const ENTER_MS_FULL = 0.52;
const ENTER_MS_REDUCE = 0.22;
/** Must be ≥ exit transition (ms) so fade completes before unmount */
const DISMISS_AFTER_EXIT_MS = 720;

function overlayAlreadyShown(): boolean {
  try {
    return sessionStorage.getItem(SESSION_OVERLAY_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Branded welcome on first entry in a browser tab session.
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
    const ms = reduce ? HOLD_MS_REDUCE : HOLD_MS_FULL;
    const id = window.setTimeout(() => setPhase("exit"), ms);
    return () => window.clearTimeout(id);
  }, [visible, phase, reduce]);

  useEffect(() => {
    if (phase !== "exit") return;
    const id = window.setTimeout(() => {
      dismiss();
    }, DISMISS_AFTER_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase, dismiss]);

  const requestExit = useCallback(() => {
    setPhase("exit");
  }, []);

  if (!visible) {
    return null;
  }

  const exitDur = reduce ? EXIT_MS_REDUCE : EXIT_MS_FULL;
  const enterDur = reduce ? ENTER_MS_REDUCE : ENTER_MS_FULL;

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[190] flex flex-col items-center justify-center overflow-hidden px-5 sm:px-6"
      role="region"
      aria-label={t("welcome.opening.a11yRegion")}
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "exit" ? 0 : 1 }}
      transition={{
        duration: phase === "exit" ? exitDur : enterDur,
        ease: [0.19, 1, 0.32, 1],
      }}
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(152deg,#9fe06a_0%,#4ec0df_18%,#e8f6ff_48%,#fbfeff_72%,#dff3d4_100%)]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 38%, rgba(255,255,255,0.55) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 80% 75%, rgba(18,150,232,0.12) 0%, transparent 50%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "exit" ? 0 : 1 }}
        transition={{ duration: enterDur + 0.15, ease: "easeOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.14) 42%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0.12) 58%, transparent 100%)",
          backgroundSize: "220% 100%",
        }}
        initial={{ backgroundPosition: "120% 0%" }}
        animate={
          reduce
            ? { backgroundPosition: "40% 0%" }
            : { backgroundPosition: ["120% 0%", "-20% 0%"] }
        }
        transition={{
          duration: reduce ? 0.01 : 1.35,
          delay: reduce ? 0 : 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[22%] top-[18%] h-56 w-56 rounded-full bg-white/40 blur-3xl sm:h-64 sm:w-64" />
        <div className="absolute -right-[18%] bottom-[22%] h-64 w-64 rounded-full bg-[#8ada33]/30 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute left-1/2 top-[30%] h-40 w-[120%] max-w-3xl -translate-x-1/2 rounded-full bg-[#1296e8]/10 blur-3xl" />
      </div>

      <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18, scale: 0.94 }}
          animate={
            reduce
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: phase === "exit" ? 0 : 1, y: 0, scale: 1 }
          }
          transition={
            reduce
              ? { duration: 0.35, ease: [0.19, 1, 0.32, 1] }
              : { type: "spring", stiffness: 118, damping: 19, mass: 0.85 }
          }
          className="mb-6 sm:mb-7"
        >
          <div className="relative rounded-[1.75rem] border border-white/55 bg-white/30 px-7 py-6 shadow-[0_28px_90px_rgba(23,54,81,0.14),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl ring-1 ring-white/75 sm:px-9 sm:py-7">
            <div
              className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-white/40 via-transparent to-[#1296e8]/10"
              aria-hidden
            />
            <motion.img
              src="/gomate-logo.png"
              alt=""
              className="relative z-[1] mx-auto h-[4.25rem] w-auto drop-shadow-[0_16px_40px_rgba(23,54,81,0.16)] sm:h-[5rem]"
              draggable={false}
              initial={reduce ? false : { opacity: 0, filter: "blur(6px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </motion.div>

        <motion.h1
          className="text-balance font-extrabold tracking-tight text-[#173651] drop-shadow-[0_2px_24px_rgba(255,255,255,0.55)]"
          style={{ fontSize: "clamp(1.4rem, 4.5vw, 1.85rem)" }}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={
            reduce
              ? { opacity: 1, y: 0 }
              : { opacity: phase === "exit" ? 0 : 1, y: 0 }
          }
          transition={{ duration: 0.52, delay: 0.38, ease: [0.19, 1, 0.32, 1] }}
        >
          {t("welcome.opening.title")}
        </motion.h1>

        <motion.p
          className="mt-3 max-w-[min(22rem,92vw)] text-pretty text-sm font-semibold leading-relaxed text-[#35556c] sm:mt-3.5 sm:text-[1.05rem]"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={
            reduce
              ? { opacity: 1, y: 0 }
              : { opacity: phase === "exit" ? 0 : 1, y: 0 }
          }
          transition={{ duration: 0.52, delay: 0.56, ease: [0.19, 1, 0.32, 1] }}
        >
          {t("welcome.opening.subtitle")}
        </motion.p>

        {!reduce ? (
          <motion.div
            className="mt-9 h-[3px] w-32 max-w-[70vw] rounded-full bg-gradient-to-r from-transparent via-[#1296e8]/45 to-transparent shadow-[0_0_24px_rgba(18,150,232,0.25)] sm:mt-10 sm:w-36"
            initial={{ opacity: 0, scaleX: 0.45 }}
            animate={
              phase === "exit"
                ? { opacity: 0, scaleX: 0.92 }
                : { opacity: 1, scaleX: 1 }
            }
            transition={{
              duration: 0.65,
              delay: phase === "exit" ? 0 : 0.88,
              ease: [0.22, 1, 0.36, 1],
            }}
            aria-hidden
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={requestExit}
        className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom,0px)+1rem)] left-1/2 z-[2] min-h-[44px] min-w-[44px] -translate-x-1/2 rounded-full border border-white/85 bg-white/85 px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#28475d] shadow-[0_12px_36px_rgba(23,54,81,0.14)] backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-safe:active:scale-[0.98] sm:text-sm"
      >
        {t("welcome.opening.skip")}
      </button>
    </motion.div>
  );
}
