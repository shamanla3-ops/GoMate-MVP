import { useEffect, useState } from "react";
import { useTranslation } from "../i18n";

const DISMISS_KEY = "gomate-push-prompt-dismissed";

function isNotificationsSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export default function PushPermissionPrompt() {
  const { t } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const browserSupportsNotifications = isNotificationsSupported();
    setSupported(browserSupportsNotifications);

    if (!browserSupportsNotifications) {
      return;
    }

    setPermission(Notification.permission);

    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      setDismissed(stored === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function handleLater() {
    setDismissed(true);

    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function handleEnable() {
    if (!supported || requesting) return;

    try {
      setRequesting(true);

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        try {
          localStorage.removeItem(DISMISS_KEY);
        } catch {
          // ignore
        }
        setDismissed(true);
      }
    } finally {
      setRequesting(false);
    }
  }

  if (!supported) {
    return null;
  }

  if (permission !== "default") {
    return null;
  }

  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-[420px]">
      <div className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.14)] backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-xl text-white shadow-md">
            🔔
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-extrabold text-[#173651]">
              {t("pushPrompt.title")}
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#4a6678]">
              {t("pushPrompt.body")}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleEnable}
                disabled={requesting}
                className="flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(39,149,119,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {requesting ? t("pushPrompt.requesting") : t("pushPrompt.allow")}
              </button>

              <button
                type="button"
                onClick={handleLater}
                className="flex h-11 items-center justify-center rounded-full border border-[#d9e5ec] bg-white px-5 text-sm font-semibold text-[#29485d] shadow-sm"
              >
                {t("pushPrompt.later")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}