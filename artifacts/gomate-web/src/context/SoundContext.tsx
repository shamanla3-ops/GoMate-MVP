import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  playCarArrivalSound,
  playCarDriveAwaySound,
  playCarEngineStartSound,
  playChatReceiveSound,
  playChatSendSound,
  playModalOpenSound,
  playNewRideRequestSound,
  playRequestApprovedSound,
  playRideMatchSound,
  playUiClickSound,
  playUiSuccessSound,
  resumeAudioContext,
} from "../lib/uiSoundEngine";

const STORAGE_KEY = "gomate-ui-sounds-enabled";

function readStoredEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v !== "0";
  } catch {
    return true;
  }
}

function writeStoredEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type SoundContextValue = {
  /** User preference (still respects reduced motion for actual playback). */
  soundEnabled: boolean;
  setSoundEnabled: (on: boolean) => void;
  /** Sounds may play (preference on and no reduced motion). */
  effectiveSoundOn: boolean;
  reducedMotion: boolean;
  playClick: () => void;
  /** Success + optional very soft modal open layer */
  playCelebration: (options?: { modalOpen?: boolean }) => void;
  playChatSend: () => void;
  /** Debounced; safe for polling — one soft tone per burst of new inbound messages */
  playChatReceive: () => void;
  playSuccessChime: () => void;
  playModalOpenSoft: () => void;
  playCarEngineStart: () => void;
  playCarDriveAway: () => void;
  playCarArrival: () => void;
  /** Driver: new pending incoming request (debounced) */
  playNewRideRequest: () => void;
  /** Passenger: request just accepted */
  playRequestApproved: () => void;
  /** Passenger: match / connected moment */
  playRideMatch: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

let lastClickSoundAt = 0;
const CLICK_DEBOUNCE_MS = 96;
let lastChatReceiveSoundAt = 0;
const CHAT_RECEIVE_DEBOUNCE_MS = 380;
let lastNewRideRequestSoundAt = 0;
const NEW_RIDE_REQUEST_DEBOUNCE_MS = 720;

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(readStoredEnabled);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const unlock = () => {
      void resumeAudioContext();
    };
    window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    return () =>
      window.removeEventListener("pointerdown", unlock, { capture: true });
  }, []);

  const effectiveSoundOn = soundEnabled && !reducedMotion;

  const setSoundEnabled = useCallback((on: boolean) => {
    setSoundEnabledState(on);
    writeStoredEnabled(on);
  }, []);

  const playClick = useCallback(() => {
    if (!effectiveSoundOn) return;
    const now = performance.now();
    if (now - lastClickSoundAt < CLICK_DEBOUNCE_MS) return;
    lastClickSoundAt = now;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playUiClickSound(ctx, 0.085);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playCelebration = useCallback(
    (options?: { modalOpen?: boolean }) => {
      if (!effectiveSoundOn) return;

      void resumeAudioContext().then((ctx) => {
        if (!ctx || !effectiveSoundOn) return;
        try {
          if (options?.modalOpen) {
            playModalOpenSound(ctx, 0.022);
            window.setTimeout(() => {
              void resumeAudioContext().then((c2) => {
                if (!c2 || !effectiveSoundOn) return;
                try {
                  playUiSuccessSound(c2, 0.062);
                } catch {
                  /* ignore */
                }
              });
            }, 42);
          } else {
            playUiSuccessSound(ctx, 0.065);
          }
        } catch {
          /* ignore */
        }
      });
    },
    [effectiveSoundOn]
  );

  const playChatSend = useCallback(() => {
    if (!effectiveSoundOn) return;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playChatSendSound(ctx, 0.052);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playChatReceive = useCallback(() => {
    if (!effectiveSoundOn) return;
    const now = performance.now();
    if (now - lastChatReceiveSoundAt < CHAT_RECEIVE_DEBOUNCE_MS) return;
    lastChatReceiveSoundAt = now;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playChatReceiveSound(ctx, 0.045);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playSuccessChime = useCallback(() => {
    if (!effectiveSoundOn) return;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playUiSuccessSound(ctx, 0.058);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playModalOpenSoft = useCallback(() => {
    if (!effectiveSoundOn) return;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playModalOpenSound(ctx, 0.02);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playCarEngineStart = useCallback(() => {
    if (!effectiveSoundOn) return;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playCarEngineStartSound(ctx, 0.034);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playCarDriveAway = useCallback(() => {
    if (!effectiveSoundOn) return;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playCarDriveAwaySound(ctx, 0.028);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playCarArrival = useCallback(() => {
    if (!effectiveSoundOn) return;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playCarArrivalSound(ctx, 0.024);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playNewRideRequest = useCallback(() => {
    if (!effectiveSoundOn) return;
    const now = performance.now();
    if (now - lastNewRideRequestSoundAt < NEW_RIDE_REQUEST_DEBOUNCE_MS) return;
    lastNewRideRequestSoundAt = now;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playNewRideRequestSound(ctx, 0.04);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playRequestApproved = useCallback(() => {
    if (!effectiveSoundOn) return;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playRequestApprovedSound(ctx, 0.048);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const playRideMatch = useCallback(() => {
    if (!effectiveSoundOn) return;
    void resumeAudioContext().then((ctx) => {
      if (!ctx || !effectiveSoundOn) return;
      try {
        playRideMatchSound(ctx, 0.044);
      } catch {
        /* ignore */
      }
    });
  }, [effectiveSoundOn]);

  const value = useMemo(
    () => ({
      soundEnabled,
      setSoundEnabled,
      effectiveSoundOn,
      reducedMotion,
      playClick,
      playCelebration,
      playChatSend,
      playChatReceive,
      playSuccessChime,
      playModalOpenSoft,
      playCarEngineStart,
      playCarDriveAway,
      playCarArrival,
      playNewRideRequest,
      playRequestApproved,
      playRideMatch,
    }),
    [
      soundEnabled,
      setSoundEnabled,
      effectiveSoundOn,
      reducedMotion,
      playClick,
      playCelebration,
      playChatSend,
      playChatReceive,
      playSuccessChime,
      playModalOpenSoft,
      playCarEngineStart,
      playCarDriveAway,
      playCarArrival,
      playNewRideRequest,
      playRequestApproved,
      playRideMatch,
    ]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

/** Safe outside provider: no-ops. */
export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    const noop = () => {};
    return {
      soundEnabled: true,
      setSoundEnabled: noop,
      effectiveSoundOn: false,
      reducedMotion: false,
      playClick: noop,
      playCelebration: noop,
      playChatSend: noop,
      playChatReceive: noop,
      playSuccessChime: noop,
      playModalOpenSoft: noop,
      playCarEngineStart: noop,
      playCarDriveAway: noop,
      playCarArrival: noop,
      playNewRideRequest: noop,
      playRequestApproved: noop,
      playRideMatch: noop,
    };
  }
  return ctx;
}
