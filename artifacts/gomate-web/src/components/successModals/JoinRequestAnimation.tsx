import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useSound } from "../../context/SoundContext";

const SCENE_MS = 4200;

/**
 * Passenger waits → car arrives → passenger enters (hidden before departure) → drive away.
 * Sounds aligned to motion milestones (arrival / enter / depart / chime).
 */
export function JoinRequestAnimation() {
  const reduce = useReducedMotion();
  const {
    playModalOpenSoft,
    playCarArrival,
    playCarEngineStart,
    playCarDriveAway,
    playSuccessChime,
  } = useSound();

  useEffect(() => {
    if (reduce) return;
    const tModal = window.setTimeout(() => playModalOpenSoft(), 70);
    const tArrive = window.setTimeout(() => playCarArrival(), 1260);
    const tEngine = window.setTimeout(() => playCarEngineStart(), 1760);
    const tDrive = window.setTimeout(() => playCarDriveAway(), 2020);
    const tChime = window.setTimeout(() => playSuccessChime(), 3780);
    return () => {
      window.clearTimeout(tModal);
      window.clearTimeout(tArrive);
      window.clearTimeout(tEngine);
      window.clearTimeout(tDrive);
      window.clearTimeout(tChime);
    };
  }, [
    reduce,
    playModalOpenSoft,
    playCarArrival,
    playCarEngineStart,
    playCarDriveAway,
    playSuccessChime,
  ]);

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

  const d = SCENE_MS / 1000;

  return (
    <div
      className="relative mx-auto h-[180px] w-full max-w-[300px] overflow-hidden sm:h-[200px]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-x-6 bottom-[52px] h-2 rounded-full bg-gradient-to-r from-transparent via-[#8ada33]/22 to-transparent" />

      <motion.div
        className="absolute bottom-[50px] left-[10%] z-[2] flex flex-col items-center will-change-transform"
        initial={{ x: 0, opacity: 1 }}
        animate={{
          x: [0, 0, 40, 40],
          opacity: [1, 1, 1, 0],
        }}
        transition={{
          duration: d,
          times: [0, 0.26, 0.42, 0.47],
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <div className="h-2.5 w-2.5 rounded-full bg-[#28475d] ring-2 ring-white/90" />
        <div className="mt-0.5 h-[18px] w-[11px] rounded-md bg-[#3d5668]" />
      </motion.div>

      <motion.div
        className="absolute bottom-[46px] z-[1] will-change-transform"
        style={{ left: "100%", marginLeft: "-118px" }}
        initial={{ x: 148 }}
        animate={{ x: [148, 6, 6, 210] }}
        transition={{
          duration: d,
          times: [0, 0.3, 0.48, 1],
          ease: [0.33, 0, 0.2, 1],
        }}
      >
        <div className="relative">
          <motion.div
            className="h-9 w-[4.5rem] rounded-xl bg-gradient-to-r from-[#6fd456] to-[#1296e8] shadow-[0_14px_32px_rgba(36,151,119,0.26)] ring-1 ring-white/55"
            animate={{ y: [0, 0, -0.8, 0, 0, 0] }}
            transition={{
              duration: d,
              times: [0, 0.28, 0.32, 0.38, 0.48, 1],
              ease: "easeInOut",
            }}
          />
          <div className="absolute -bottom-1 left-1.5 h-2 w-2 rounded-full bg-[#1f3548]/90 ring-1 ring-white/40" />
          <div className="absolute -bottom-1 right-1.5 h-2 w-2 rounded-full bg-[#1f3548]/90 ring-1 ring-white/40" />
        </div>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-[54px] left-[18%] h-1 w-12 rounded-full bg-gradient-to-r from-[#1296e8]/30 to-transparent opacity-0"
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: [0, 0, 0.4, 0], x: [0, 0, -8, -16] }}
        transition={{ duration: d, times: [0, 0.28, 0.34, 0.42] }}
      />
    </div>
  );
}
