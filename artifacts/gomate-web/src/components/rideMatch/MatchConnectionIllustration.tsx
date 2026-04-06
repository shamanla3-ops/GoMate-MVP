import { motion, useReducedMotion } from "framer-motion";

type Props = {
  driverLabel: string;
  passengerLabel: string;
};

/** Two chips connect with a soft route line and check — ~0.9s */
export function MatchConnectionIllustration({ driverLabel, passengerLabel }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div
        className="mx-auto flex w-full max-w-[280px] flex-col items-center gap-3 py-1"
        aria-hidden
      >
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-center rounded-2xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5d7485]">
              {passengerLabel}
            </span>
            <span className="mt-1 h-9 w-9 rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] shadow-inner ring-2 ring-white" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center rounded-2xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5d7485]">
              {driverLabel}
            </span>
            <span className="mt-1 h-9 w-9 rounded-full bg-[linear-gradient(180deg,#1296e8_0%,#163c59_100%)] shadow-inner ring-2 ring-white" />
          </div>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff7d4] text-lg text-[#2d8042] shadow-sm ring-2 ring-[#b6e86f]/50"
          aria-hidden
        >
          ✓
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[120px] w-full max-w-[300px]" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 120" fill="none">
        <motion.path
          d="M 52 62 C 110 62, 120 62, 150 62 C 180 62, 190 62, 248 62"
          stroke="url(#matchGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.42, 0, 0.58, 1], delay: 0.12 }}
        />
        <defs>
          <linearGradient id="matchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8ada33" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1296e8" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>

      <motion.div
        className="absolute left-[6%] top-[18px] flex flex-col items-center"
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.38, ease: [0.42, 0, 0.58, 1] }}
      >
        <span className="max-w-[100px] truncate text-[10px] font-semibold uppercase tracking-wider text-[#5d7485]">
          {passengerLabel}
        </span>
        <motion.div
          className="mt-1 h-11 w-11 rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] shadow-[0_8px_20px_rgba(25,151,232,0.25)] ring-2 ring-white"
          initial={{ scale: 0.92 }}
          animate={{ scale: [0.92, 1, 1] }}
          transition={{ duration: 0.5, times: [0, 0.45, 1], ease: [0.42, 0, 0.58, 1] }}
        />
      </motion.div>

      <motion.div
        className="absolute right-[6%] top-[18px] flex flex-col items-center"
        initial={{ x: 10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.38, ease: [0.42, 0, 0.58, 1], delay: 0.06 }}
      >
        <span className="max-w-[100px] truncate text-[10px] font-semibold uppercase tracking-wider text-[#5d7485]">
          {driverLabel}
        </span>
        <motion.div
          className="mt-1 h-11 w-11 rounded-full bg-[linear-gradient(180deg,#1296e8_0%,#163c59_100%)] shadow-[0_8px_20px_rgba(18,150,232,0.28)] ring-2 ring-white"
          initial={{ scale: 0.92 }}
          animate={{ scale: [0.92, 1, 1] }}
          transition={{ duration: 0.5, times: [0, 0.45, 1], ease: [0.42, 0, 0.58, 1], delay: 0.06 }}
        />
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-[56px] flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-[#dff7d4] text-base font-bold text-[#2d8042] shadow-[0_6px_16px_rgba(45,128,66,0.2)] ring-2 ring-white/90"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.52 }}
      >
        ✓
      </motion.div>
    </div>
  );
}
