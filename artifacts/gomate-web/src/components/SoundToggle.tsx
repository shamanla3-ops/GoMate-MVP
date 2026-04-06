import { useSound } from "../context/SoundContext";
import { useTranslation } from "../i18n";

type Props = {
  /** Floating control for all routes; sits above footer safe area. */
  variant?: "floating" | "inline";
};

function IconSpeaker({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {on ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18 6a8 8 0 0 1 0 12" />
        </>
      ) : (
        <path d="m22 9-6 6M16 9l6 6" />
      )}
    </svg>
  );
}

export function SoundToggle({ variant = "floating" }: Props) {
  const { t } = useTranslation();
  const { soundEnabled, setSoundEnabled, effectiveSoundOn, reducedMotion, playClick } =
    useSound();

  const unavailable = reducedMotion;
  const wavesOn = soundEnabled && !reducedMotion;

  function toggle() {
    if (unavailable) return;
    playClick();
    setSoundEnabled(!soundEnabled);
  }

  const title = unavailable
    ? t("sound.toggle.unavailableReducedMotion")
    : soundEnabled
      ? t("sound.toggle.disable")
      : t("sound.toggle.enable");

  const label = unavailable
    ? t("sound.toggle.badgeReduced")
    : soundEnabled
      ? t("sound.toggle.badgeOn")
      : t("sound.toggle.badgeOff");

  const baseClass =
    variant === "floating"
      ? "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4.5rem)] right-4 z-[165] sm:bottom-28 sm:right-6"
      : "inline-flex";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={unavailable}
      title={title}
      aria-label={title}
      aria-pressed={effectiveSoundOn}
      className={`${baseClass} flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[#29485d] shadow-[0_10px_28px_rgba(23,54,81,0.14)] backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8] disabled:cursor-not-allowed disabled:opacity-55 motion-safe:hover:scale-[1.05] motion-safe:active:scale-[0.96]`}
    >
      <span className="sr-only">{label}</span>
      <IconSpeaker
        on={wavesOn}
        className={`h-[22px] w-[22px] ${unavailable ? "opacity-45" : ""}`}
      />
    </button>
  );
}
