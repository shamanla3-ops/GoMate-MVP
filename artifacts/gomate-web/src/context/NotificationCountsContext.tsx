import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL } from "../lib/api";
import { applyMatchSoundAck } from "../lib/matchSoundAck";
import { useTranslation } from "../i18n";
import { useSound } from "./SoundContext";

type NotificationCounts = {
  chatsUnread: number;
  requestsPending: number;
  reviewTasksPending: number;
  matchSuggestionsNew: number;
};

type NotificationCountsContextValue = NotificationCounts & {
  refresh: () => Promise<void>;
};

const NotificationCountsContext =
  createContext<NotificationCountsContextValue | null>(null);

const POLL_MS = 25_000;
/** Full match recompute + upsert — keeps badges fresh without running on every notification poll. */
const MATCH_RECONCILE_MS = 120_000;

export function NotificationCountsProvider({ children }: { children: ReactNode }) {
  return <NotificationCountsInner>{children}</NotificationCountsInner>;
}

function NotificationCountsInner({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { playSmartMatchNew } = useSound();

  const [chatsUnread, setChatsUnread] = useState(0);
  const [requestsPending, setRequestsPending] = useState(0);
  const [reviewTasksPending, setReviewTasksPending] = useState(0);
  const [matchSuggestionsNew, setMatchSuggestionsNew] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);

  const lastToastSigRef = useRef<string>("");

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setChatsUnread(0);
      setRequestsPending(0);
      setReviewTasksPending(0);
      setMatchSuggestionsNew(0);
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
        matchSuggestionsNew?: unknown;
        matchNewNotifiedKeys?: unknown;
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

      if (typeof data.matchSuggestionsNew === "number") {
        setMatchSuggestionsNew(data.matchSuggestionsNew);
      }

      const rawKeys = data.matchNewNotifiedKeys;
      const keys =
        Array.isArray(rawKeys) && rawKeys.every((k) => typeof k === "string")
          ? (rawKeys as string[])
          : [];

      if (keys.length > 0) {
        applyMatchSoundAck(keys, () => {
          playSmartMatchNew();
        });

        const sig = keys.join("|");
        if (sig && sig !== lastToastSigRef.current) {
          lastToastSigRef.current = sig;
          setToastOpen(true);
          window.setTimeout(() => setToastOpen(false), 8200);
        }
      }
    } catch {
      /* ignore transient network errors; next poll will retry */
    }
  }, [playSmartMatchNew]);

  const reconcileMatches = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/match-suggestions/reconcile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      await load();
    } catch {
      /* ignore */
    }
  }, [load]);

  useEffect(() => {
    void load();
    void reconcileMatches();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "token") {
        void load();
        if (localStorage.getItem("token")) {
          void reconcileMatches();
        }
      }
    };

    window.addEventListener("storage", onStorage);

    const interval = window.setInterval(() => {
      void load();
    }, POLL_MS);

    const reconcileInterval = window.setInterval(() => {
      void reconcileMatches();
    }, MATCH_RECONCILE_MS);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
      window.clearInterval(reconcileInterval);
    };
  }, [load, reconcileMatches]);

  const value = useMemo(
    () => ({
      chatsUnread,
      requestsPending,
      reviewTasksPending,
      matchSuggestionsNew,
      refresh: load,
    }),
    [chatsUnread, requestsPending, reviewTasksPending, matchSuggestionsNew, load]
  );

  return (
    <NotificationCountsContext.Provider value={value}>
      {children}
      {toastOpen ? (
        <div
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-[170] w-[min(100%,22rem)] -translate-x-1/2 px-4 md:bottom-28"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-2xl border border-white/80 bg-[#163c59]/95 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_16px_40px_rgba(23,54,81,0.35)] backdrop-blur-md">
            <p>{t("smartMatch.toast.newMatch")}</p>
            <a
              href="/smart-matches"
              className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center rounded-full bg-white/15 px-3 text-sm font-bold text-white ring-1 ring-white/25"
            >
              {t("smartMatch.toast.viewMatches")}
            </a>
          </div>
        </div>
      ) : null}
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
