import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useSound } from "../../context/SoundContext";

const CAR_MS = 3850;
const PERSON_MS = 1100;

/** Driver walks to car, enters; engine; car departs — synced UI sounds */
export function TripCreatedAnimation() {
  const reduce = useReducedMotion();
  const {
    playModalOpenSoft,
    playCarEngineStart,
    playCarDriveAway,
    playSuccessChime,
  } = useSound();

  useEffect(() => {
    if (reduce) return;
    const tModal = window.setTimeout(() => playModalOpenSoft(), 70);
    const tEngine = window.setTimeout(() => playCarEngineStart(), 1020);
    const tDrive = window.setTimeout(() => playCarDriveAway(), 1330);
    const tChime = window.setTimeout(() => playSuccessChime(), 3480);
    return () => {
      window.clearTimeout(tModal);
      window.clearTimeout(tEngine);
      window.clearTimeout(tDrive);
      window.clearTimeout(tChime);
    };
  }, [
    reduce,
    playModalOpenSoft,
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
        <div className="absolute bottom-10 left-6 right-6 h-2 rounded-full bg-gradient-to-r from-transparent via-[#1296e8]/25 to-transparent" />
        <div className="relative mb-[42px] flex items-end gap-2">
          <div className="h-9 w-14 rounded-xl bg-gradient-to-r from-[#1296e8] to-[#163c59] shadow-[0_10px_24px_rgba(23,54,81,0.2)]" />
          <div className="mb-1 flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-[#28475d]" />
            <div className="mt-0.5 h-4 w-3 rounded-md bg-[#3d5668]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto h-[180px] w-full max-w-[300px] overflow-hidden sm:h-[200px]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-x-6 bottom-[52px] h-2 rounded-full bg-gradient-to-r from-transparent via-[#1296e8]/22 to-transparent" />
      <div className="pointer-events-none absolute bottom-[46px] left-[18%] h-3 w-24 rounded-full bg-[#173651]/8 blur-md" />

      <motion.div
        className="absolute bottom-[50px] left-[8%] flex flex-col items-center will-change-transform"
        initial={{ x: 0, opacity: 1 }}
        animate={{
          x: [0, 56, 56],
          opacity: [1, 1, 0],
        }}
        transition={{
          duration: PERSON_MS / 1000,
          times: [0, 0.76, 1],
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <div className="h-2.5 w-2.5 rounded-full bg-[#28475d] ring-2 ring-white/90" />
        <div className="mt-0.5 h-[18px] w-[11px] rounded-md bg-[#3d5668]" />
      </motion.div>

      <motion.div
        className="absolute bottom-[46px] left-[22%] will-change-transform"
        initial={{ x: 0 }}
        animate={{ x: [0, 0, 220] }}
        transition={{
          duration: CAR_MS / 1000,
          times: [0, 0.346, 1],
          ease: [0.33, 0, 0.2, 1],
        }}
      >
        <div className="relative">
          <motion.div
            className="h-9 w-[4.5rem] rounded-xl bg-gradient-to-r from-[#1296e8] to-[#163c59] shadow-[0_14px_32px_rgba(25,151,232,0.28)] ring-1 ring-white/50"
            animate={{ y: [0, -1.5, 0, -1.2, 0, 0, 0] }}
            transition={{
              duration: CAR_MS / 1000,
              times: [0, 0.08, 0.18, 0.28, 0.34, 0.346, 1],
              ease: "easeInOut",
            }}
          />
          <div className="absolute -bottom-1 left-1.5 h-2 w-2 rounded-full bg-[#1f3548]/90 ring-1 ring-white/40" />
          <div className="absolute -bottom-1 right-1.5 h-2 w-2 rounded-full bg-[#1f3548]/90 ring-1 ring-white/40" />
        </div>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-[54px] right-[12%] h-1 w-10 rounded-full bg-gradient-to-l from-[#8ada33]/35 to-transparent opacity-0"
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: [0, 0, 0, 0.52, 0], x: [0, 0, 0, 14, 28] }}
        transition={{
          duration: CAR_MS / 1000,
          times: [0, 0.33, 0.346, 0.78, 1],
        }}
      />
    </div>
  );
}
