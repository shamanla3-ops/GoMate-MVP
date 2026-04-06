import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { useSound } from "../context/SoundContext";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { formatDateTimeShort, formatTimeOnly } from "../lib/intlLocale";
import { messageFromApiError } from "../lib/errorMessages";

type CurrentUserLike = {
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
};

type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
};

type ChatDetails = {
  id: string;
  tripId: string;
  driverId: string;
  passengerId: string;
  driverLastReadAt?: string | null;
  passengerLastReadAt?: string | null;
  createdAt: string;
  trip?: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
    status: string;
  } | null;
  driver?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    rating?: number | null;
    phoneNumber?: string | null;
  } | null;
  passenger?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    rating?: number | null;
    phoneNumber?: string | null;
  } | null;
};

const QUICK_EMOJIS = ["😀", "👍", "👌", "🚗", "⏰", "📍", "✅", "❌"];

const NEAR_BOTTOM_PX = 120;
const TEXTAREA_MAX_HEIGHT_PX = 192;

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isNearBottom(el: HTMLElement, thresholdPx: number): boolean {
  const { scrollTop, scrollHeight, clientHeight } = el;
  return scrollHeight - scrollTop - clientHeight <= thresholdPx;
}

function scrollContainerToBottom(el: HTMLElement, behavior: ScrollBehavior) {
  el.scrollTo({ top: el.scrollHeight, behavior });
}

export default function Chat() {
  const { t, locale } = useTranslation();
  const { chatId } = useParams();
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const { playChatSend, playChatReceive } = useSound();
  const [currentUser, setCurrentUser] = useState<CurrentUserLike | null>(null);
  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const wasNearBottomBeforeLoadRef = useRef(true);
  const forceScrollToBottomRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(0);
  const chatSoundBootstrappedRef = useRef(false);
  const seenMessageIdsForSoundRef = useRef<Set<string>>(new Set());

  async function loadCurrentUser() {
    const user = (await getCurrentUser()) as CurrentUserLike | null;
    setCurrentUser(user);
  }

  async function markChatAsRead() {
    const token = localStorage.getItem("token");

    if (!token || !chatId) {
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/api/trip-chats/${chatId}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // silently ignore
    }
  }

  async function loadMessages() {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!chatId) {
      setMessage(t("chatPage.notFound"));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/trip-chats/${chatId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(messageFromApiError(data, t, "chatPage.loadError"));
        setLoading(false);
        return;
      }

      const scrollEl = scrollContainerRef.current;
      const priorMessages = messagesRef.current;
      wasNearBottomBeforeLoadRef.current =
        !scrollEl || priorMessages.length === 0
          ? true
          : isNearBottom(scrollEl, NEAR_BOTTOM_PX);

      setChat(data.chat ?? null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setMessage("");
      await markChatAsRead();
      void refreshNotificationCounts();
    } catch {
      setMessage(t("chatPage.serverError"));
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(rawText: string) {
    const token = localStorage.getItem("token");
    const preparedText = rawText.trim();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!chatId || !preparedText || sending) {
      return;
    }

    try {
      setSending(true);
      setMessage("");
      forceScrollToBottomRef.current = true;

      const res = await fetch(`${API_BASE_URL}/api/trip-chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: preparedText }),
      });

      const data = await res.json();

      if (!res.ok) {
        forceScrollToBottomRef.current = false;
        setMessage(messageFromApiError(data, t, "chatPage.sendError"));
        return;
      }

      playChatSend();
      setText("");
      await loadMessages();
    } catch {
      forceScrollToBottomRef.current = false;
      setMessage(t("chatPage.sendError"));
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(text);
  }

  function insertQuickEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;

    setText((prev) => {
      const safeStart = Math.min(Math.max(0, start), prev.length);
      const safeEnd = Math.min(Math.max(0, end), prev.length);
      const next = prev.slice(0, safeStart) + emoji + prev.slice(safeEnd);
      const caret = safeStart + emoji.length;

      requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (!node) return;
        node.focus();
        try {
          node.setSelectionRange(caret, caret);
        } catch {
          /* ignore */
        }
      });

      return next;
    });
  }

  useEffect(() => {
    chatSoundBootstrappedRef.current = false;
    seenMessageIdsForSoundRef.current = new Set();
  }, [chatId]);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [chatId]);

  useLayoutEffect(() => {
    const uid = currentUser?.id ?? currentUser?.userId ?? "";
    if (!chatId || !uid || messages.length === 0) return;
    if (chat?.id !== chatId) return;

    const seen = seenMessageIdsForSoundRef.current;
    if (!chatSoundBootstrappedRef.current) {
      messages.forEach((m) => seen.add(m.id));
      chatSoundBootstrappedRef.current = true;
      return;
    }

    let playedReceive = false;
    for (const m of messages) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      if (m.senderId !== uid && !playedReceive) {
        playChatReceive();
        playedReceive = true;
      }
    }
  }, [messages, currentUser, playChatReceive, chatId, chat?.id]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (forceScrollToBottomRef.current) {
      forceScrollToBottomRef.current = false;
      scrollContainerToBottom(el, "smooth");
      setShowJumpToLatest(false);
      prevLastMessageIdRef.current = messages[messages.length - 1]?.id ?? null;
      prevMessageCountRef.current = messages.length;
      return;
    }

    if (!initialScrollDoneRef.current) {
      if (messages.length > 0) {
        scrollContainerToBottom(el, "auto");
        initialScrollDoneRef.current = true;
      }
      prevLastMessageIdRef.current = messages[messages.length - 1]?.id ?? null;
      prevMessageCountRef.current = messages.length;
      return;
    }

    const lastId = messages[messages.length - 1]?.id ?? null;
    const prevLast = prevLastMessageIdRef.current;
    const prevCount = prevMessageCountRef.current;
    const grew = messages.length > prevCount;
    const lastChanged = lastId !== prevLast;
    const newActivity = grew || lastChanged;

    if (wasNearBottomBeforeLoadRef.current) {
      if (newActivity) {
        scrollContainerToBottom(el, "smooth");
        setShowJumpToLatest(false);
      }
    } else if (newActivity && messages.length > 0) {
      setShowJumpToLatest(true);
    }

    prevLastMessageIdRef.current = lastId;
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
  }, [text]);

  function handleMessagesScroll() {
    const el = scrollContainerRef.current;
    if (el && isNearBottom(el, NEAR_BOTTOM_PX)) {
      setShowJumpToLatest(false);
    }
  }

  function handleJumpToLatest() {
    const el = scrollContainerRef.current;
    if (!el) return;
    scrollContainerToBottom(el, "smooth");
    setShowJumpToLatest(false);
  }

  const currentUserId = currentUser?.id ?? currentUser?.userId ?? "";
  const isDriver = useMemo(() => {
    if (!chat || !currentUserId) return false;
    return chat.driverId === currentUserId;
  }, [chat, currentUserId]);

  const otherPersonName = useMemo(() => {
    if (!chat) return t("chatPage.defaultTitle");
    if (isDriver) return chat.passenger?.name || t("chatPage.passenger");
    return chat.driver?.name || t("chatPage.driver");
  }, [chat, isDriver, t]);

  const otherPersonAvatar = useMemo(() => {
    if (!chat) return null;
    if (isDriver) return chat.passenger?.avatarUrl || null;
    return chat.driver?.avatarUrl || null;
  }, [chat, isDriver]);

  const tripLabel = useMemo(() => {
    if (!chat?.trip) return "";
    return `${chat.trip.origin} → ${chat.trip.destination}`;
  }, [chat]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef4f8]">
        <div className="text-lg text-[#35556c]">{t("chatPage.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#eef4f8] text-[#193549]">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#a9df74_0%,#59c7df_18%,#eef8ff_42%,#f9fcff_58%,#e9f7e1_76%,#b8e07d_100%)]" />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 h-[220px] w-[120%] -translate-x-1/2 rounded-b-[50%] bg-white/45 blur-xl" />
          <div className="absolute top-24 left-[8%] h-28 w-28 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute top-20 right-[10%] h-24 w-24 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-36 left-[-8%] h-56 w-72 rounded-full bg-[#b6e86f]/35 blur-3xl" />
          <div className="absolute bottom-24 right-[-6%] h-56 w-72 rounded-full bg-[#8fdf79]/35 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-10">
          <AppPageHeader>
            <div className="hidden items-center gap-3 md:flex">
              <a
                href="/trips"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("chatPage.navTrips")}
              </a>
              <a
                href="/requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("chatPage.navRequests")}
              </a>
              <a
                href="/chats"
                className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                {t("chatPage.navChats")}
              </a>
              <a
                href="/profile"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("chatPage.navProfile")}
              </a>
            </div>
          </AppPageHeader>

          <div className="flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/60 bg-white/35 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 border-b border-white/60 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                {otherPersonAvatar ? (
                  <img
                    src={otherPersonAvatar}
                    alt={otherPersonName}
                    className="h-14 w-14 rounded-full object-cover ring-4 ring-white/80"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-lg font-extrabold text-white ring-4 ring-white/80">
                    {getInitials(otherPersonName) || "G"}
                  </div>
                )}

                <div>
                  <div className="text-2xl font-extrabold text-[#173651]">
                    {otherPersonName}
                  </div>
                  <div className="mt-1 text-sm text-[#4a6678]">
                    {tripLabel || t("chatPage.tripChat")}
                  </div>
                  {chat?.trip?.departureTime && (
                    <div className="mt-1 text-xs text-[#6b8495]">
                      {t("chatPage.departure")}{" "}
                      {formatDateTimeShort(chat.trip.departureTime, locale)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href="/chats"
                  className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm"
                >
                  {t("chatPage.allChats")}
                </a>

                {chat?.trip?.id && (
                  <a
                    href={`/trips/${chat.trip.id}`}
                    className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm"
                  >
                    {t("chatPage.openTrip")}
                  </a>
                )}
              </div>
            </div>

            {message && (
              <div className="mx-5 mt-5 rounded-[20px] border border-white/80 bg-white/75 px-4 py-3 text-sm text-[#b42318] shadow-sm sm:mx-6">
                {message}
              </div>
            )}

            <div className="relative min-h-0 flex-1 px-4 py-4 sm:px-6">
              <div
                ref={scrollContainerRef}
                onScroll={handleMessagesScroll}
                className="flex h-[52vh] max-h-[70dvh] flex-col gap-3 overflow-y-auto overflow-x-hidden rounded-[24px] border border-[#d0e4ef] bg-[#f8fcfe] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
              >
                {messages.length === 0 && (
                  <div className="my-auto text-center text-[#5d7485]">
                    {t("chatPage.emptyMessages")}
                  </div>
                )}

                {messages.map((msg) => {
                  const mine = msg.senderId === currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-[22px] px-4 py-3 shadow-sm sm:max-w-[70%] ${
                          mine
                            ? "bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] text-white"
                            : "bg-white text-[#173651]"
                        }`}
                      >
                        <div
                          className={`text-xs font-semibold ${
                            mine ? "text-white/90" : "text-[#6b8495]"
                          }`}
                        >
                          {mine ? t("chatPage.you") : msg.sender?.name || t("common.user")}
                        </div>

                        <div className="mt-1 whitespace-pre-wrap break-words text-sm sm:text-base">
                          {msg.text}
                        </div>

                        <div
                          className={`mt-2 text-[11px] ${
                            mine ? "text-white/80" : "text-[#8aa0af]"
                          }`}
                        >
                          {formatTimeOnly(msg.createdAt, locale)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {showJumpToLatest ? (
                <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex w-full max-w-md -translate-x-1/2 justify-center px-4">
                  <button
                    type="button"
                    onClick={handleJumpToLatest}
                    className="pointer-events-auto rounded-full border border-white/90 bg-[#163c59] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(23,54,81,0.35)] transition hover:bg-[#1a4a6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2"
                  >
                    {t("chatPage.jumpToLatest")}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/60 bg-white/25 px-4 py-4 sm:px-6">
              <div className="rounded-[26px] border border-[#c8dce8] bg-white/95 p-3 shadow-[0_16px_40px_rgba(23,54,81,0.1)] ring-1 ring-white/80 backdrop-blur-md">
                <p
                  id="chat-quick-emojis-label"
                  className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f8798]"
                >
                  {t("chatPage.quickEmojisLabel")}
                </p>
                <div
                  className="mb-3 flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby="chat-quick-emojis-label"
                >
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertQuickEmoji(emoji);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          insertQuickEmoji(emoji);
                        }
                      }}
                      disabled={sending}
                      aria-label={t("chatPage.insertEmoji", { emoji })}
                      className="flex h-11 min-w-[44px] items-center justify-center rounded-full border border-[#dfeaf1] bg-[#f4fafc] px-3 text-xl shadow-sm transition hover:border-[#1296e8]/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 motion-safe:active:scale-[0.96]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <label className="sr-only" htmlFor="chat-composer-input">
                    {t("chatPage.placeholder")}
                  </label>
                  <textarea
                    id="chat-composer-input"
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!sending && text.trim()) {
                          sendMessage(text);
                        }
                      }
                    }}
                    placeholder={t("chatPage.placeholder")}
                    rows={1}
                    autoComplete="off"
                    className="min-h-[52px] w-full flex-1 resize-none rounded-[22px] border border-[#d7e4eb] bg-white px-4 py-3.5 text-base leading-relaxed text-[#173651] shadow-[inset_0_1px_2px_rgba(23,54,81,0.06)] outline-none transition placeholder:text-[#7a94a5] focus-visible:border-[#1296e8]/60 focus-visible:ring-2 focus-visible:ring-[#1296e8]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:min-h-[56px] sm:text-[15px]"
                  />

                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="flex min-h-[52px] shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-7 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.38)] transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[56px] sm:px-8"
                  >
                    {sending ? t("chatPage.sending") : t("chatPage.send")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
