import { useEffect, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { useTranslation } from "../i18n";

const DISMISS_KEY = "gomate-push-prompt-dismissed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isNotificationsSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export default function PushPermissionPrompt() {
  const { t } = useTranslation();

  const [supported, setSupported] = useState(false);
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const browserSupportsNotifications = isNotificationsSupported();

    setSupported(browserSupportsNotifications);

    if (!browserSupportsNotifications) {
      setVisible(false);
      return;
    }

    if (!token) {
      setVisible(false);
      return;
    }

    if (Notification.permission !== "default") {
      setVisible(false);
      return;
    }

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  function handleLater() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }

    setVisible(false);
  }

  async function handleEnable() {
    const token = localStorage.getItem("token");

    if (!supported || requesting || !token) {
      return;
    }

    try {
      setRequesting(true);

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const publicKeyResponse = await fetch(`${API_BASE_URL}/api/push/public-key`, {
        method: "GET",
      });

      const publicKeyData = await publicKeyResponse.json();

      if (!publicKeyResponse.ok || !publicKeyData.key) {
        throw new Error("Failed to load VAPID public key");
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKeyData.key),
        });
      }

      const subscribeResponse = await fetch(`${API_BASE_URL}/api/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      });

      const subscribeData = await subscribeResponse.json().catch(() => null);

      if (!subscribeResponse.ok) {
        throw new Error(subscribeData?.error || "Failed to save push subscription");
      }

      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        // ignore
      }

      setVisible(false);
    } catch (error) {
      console.error("Push subscribe error:", error);
    } finally {
      setRequesting(false);
    }
  }

  if (!supported || !visible) {
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