import { useEffect, useState } from "react";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export default function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      setVisible(true);
    }
  }, []);

  const subscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/sw.js");

      const res = await fetch("/api/push/public-key");
      const data = await res.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      });

      const token = localStorage.getItem("token");

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      });

      setVisible(false);
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white shadow-xl rounded-2xl p-4 z-50">
      <div className="flex flex-col gap-2">
        <div className="font-semibold">🔔 Enable notifications?</div>
        <div className="text-sm text-gray-600">
          Get updates about requests, chats and trips.
        </div>
        <button
          onClick={subscribe}
          className="mt-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl py-2"
        >
          Allow
        </button>
      </div>
    </div>
  );
}