import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL } from "../lib/api";

type NotificationCounts = {
  chatsUnread: number;
  requestsPending: number;
  reviewTasksPending: number;
};

type NotificationCountsContextValue = NotificationCounts & {
  refresh: () => Promise<void>;
};

const NotificationCountsContext =
  createContext<NotificationCountsContextValue | null>(null);

const POLL_MS = 25_000;

export function NotificationCountsProvider({ children }: { children: ReactNode }) {
  const [chatsUnread, setChatsUnread] = useState(0);
  const [requestsPending, setRequestsPending] = useState(0);
  const [reviewTasksPending, setReviewTasksPending] = useState(0);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setChatsUnread(0);
      setRequestsPending(0);
      setReviewTasksPending(0);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res.json().catch(() => null)) as {
        chatsUnread?: unknown;
        requestsPending?: unknown;
        reviewTasksPending?: unknown;
        error?: string;
      } | null;

      if (!res.ok || !data) {
        return;
      }

      if (typeof data.chatsUnread === "number") {
        setChatsUnread(data.chatsUnread);
      }

      if (typeof data.requestsPending === "number") {
        setRequestsPending(data.requestsPending);
      }

      if (typeof data.reviewTasksPending === "number") {
        setReviewTasksPending(data.reviewTasksPending);
      }
    } catch {
      /* ignore transient network errors; next poll will retry */
    }
  }, []);

  useEffect(() => {
    void load();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "token") {
        void load();
      }
    };

    window.addEventListener("storage", onStorage);

    const interval = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, [load]);

  const value = useMemo(
    () => ({
      chatsUnread,
      requestsPending,
      reviewTasksPending,
      refresh: load,
    }),
    [chatsUnread, requestsPending, reviewTasksPending, load]
  );

  return (
    <NotificationCountsContext.Provider value={value}>
      {children}
    </NotificationCountsContext.Provider>
  );
}

export function useNotificationCounts(): NotificationCountsContextValue {
  const ctx = useContext(NotificationCountsContext);
  if (!ctx) {
    throw new Error("useNotificationCounts must be used within NotificationCountsProvider");
  }
  return ctx;
}
