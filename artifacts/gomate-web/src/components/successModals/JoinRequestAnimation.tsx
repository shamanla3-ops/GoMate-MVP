import { motion, useReducedMotion } from "framer-motion";

/** Passenger waits, car arrives, pickup, depart together */
export function JoinRequestAnimation() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div
        className="relative mx-auto flex h-[168px] w-full max-w-[280px] items-end justify-center"
        aria-hidden
      >
        <div className="absolute bottom-10 left-6 right-6 h-2 rounded-full bg-gradient-to-r from-transparent via-[#8ada33]/28 to-transparent" />
        <div className="relative mb-[42px] flex items-end gap-3">
          <div className="mb-1 flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-[#28475d]" />
            <div className="mt-0.5 h-4 w-3 rounded-md bg-[#3d5668]" />
          </div>
          <div className="h-9 w-14 rounded-xl bg-gradient-to-r from-[#6fd456] to-[#1296e8] shadow-[0_10px_24px_rgba(23,54,81,0.18)]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto h-[180px] w-full max-w-[300px] overflow-hidden sm:h-[200px]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-x-6 bottom-[52px] h-2 rounded-full bg-gradient-to-r from-transparent via-[#8ada33]/22 to-transparent" />

      <motion.div
        className="absolute bottom-[50px] left-[10%] flex flex-col items-center will-change-transform"
        initial={{ x: 0, opacity: 1 }}
        animate={{
          x: [0, 0, 44, 44],
          opacity: [1, 1, 1, 0],
        }}
        transition={{
          duration: 3.8,
          times: [0, 0.28, 0.52, 0.62],
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <div className="h-2.5 w-2.5 rounded-full bg-[#28475d] ring-2 ring-white/90" />
        <div className="mt-0.5 h-[18px] w-[11px] rounded-md bg-[#3d5668]" />
      </motion.div>

      <motion.div
        className="absolute bottom-[46px] will-change-transform"
        style={{ left: "100%", marginLeft: "-120px" }}
        initial={{ x: 140 }}
        animate={{ x: [140, 8, 8, 200] }}
        transition={{
          duration: 4,
          times: [0, 0.32, 0.55, 1],
          ease: [0.33, 0, 0.2, 1],
        }}
      >
        <div className="relative">
          <div className="h-9 w-[4.5rem] rounded-xl bg-gradient-to-r from-[#6fd456] to-[#1296e8] shadow-[0_14px_32px_rgba(36,151,119,0.26)] ring-1 ring-white/55" />
          <div className="absolute -bottom-1 left-1.5 h-2 w-2 rounded-full bg-[#1f3548]/90 ring-1 ring-white/40" />
          <div className="absolute -bottom-1 right-1.5 h-2 w-2 rounded-full bg-[#1f3548]/90 ring-1 ring-white/40" />
        </div>
      </motion.div>
    </div>
  );
}
