import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSound } from "../../context/SoundContext";
import {
  reviewModalBackdropVariants,
  reviewModalEase,
  reviewModalPanelVariants,
} from "../../lib/motionVariants";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  illustration: ReactNode;
  footer: ReactNode;
  a11yCloseLabel: string;
  /** Trip created / join sent — soft modal layer + success chime once per open */
  celebrationSound?: boolean;
};

export function SuccessModalShell({
  open,
  onClose,
  title,
  description,
  illustration,
  footer,
  a11yCloseLabel,
  celebrationSound = false,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { playCelebration } = useSound();

  useEffect(() => {
    if (!open || !celebrationSound) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) {
        playCelebration({ modalOpen: true });
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [open, celebrationSound, playCelebration]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    window.setTimeout(() => el?.focus(), 50);
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[170] flex items-end justify-center sm:items-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={reviewModalBackdropVariants}
          transition={reviewModalEase}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0b1f2c]/45 backdrop-blur-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
            aria-label={a11yCloseLabel}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="relative z-10 w-full max-w-md rounded-t-[28px] border border-white/75 bg-gradient-to-b from-white/98 to-[#f6fbfd]/98 p-6 shadow-[0_32px_90px_rgba(23,54,81,0.22)] backdrop-blur-md sm:rounded-[28px] sm:p-8"
            variants={reviewModalPanelVariants}
            transition={reviewModalEase}
          >
            <div className="text-center">
              <h2
                id={titleId}
                className="text-[1.35rem] font-extrabold leading-snug tracking-tight text-[#173651] sm:text-2xl"
              >
                {title}
              </h2>
              <p
                id={descId}
                className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#4a6678]"
              >
                {description}
              </p>
            </div>

            <div className="relative mt-6 flex min-h-[172px] items-center justify-center sm:min-h-[188px]">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[11rem] w-[19rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(18,150,232,0.14)_0%,rgba(138,218,51,0.07)_42%,transparent_70%)]"
                aria-hidden
              />
              <div className="relative z-[1] w-full">{illustration}</div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              {footer}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
