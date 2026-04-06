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
  playModalOpenSound,
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
};

const SoundContext = createContext<SoundContextValue | null>(null);

let lastClickSoundAt = 0;
const CLICK_DEBOUNCE_MS = 96;

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

  const value = useMemo(
    () => ({
      soundEnabled,
      setSoundEnabled,
      effectiveSoundOn,
      reducedMotion,
      playClick,
      playCelebration,
    }),
    [
      soundEnabled,
      setSoundEnabled,
      effectiveSoundOn,
      reducedMotion,
      playClick,
      playCelebration,
    ]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

/** Safe outside provider: no-ops. */
export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    return {
      soundEnabled: true,
      setSoundEnabled: () => {},
      effectiveSoundOn: false,
      reducedMotion: false,
      playClick: () => {},
      playCelebration: () => {},
    };
  }
  return ctx;
}
