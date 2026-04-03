import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { getCurrentUser } from "../lib/auth";

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

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function Chat() {
  const { chatId } = useParams();
  const [currentUser, setCurrentUser] = useState<CurrentUserLike | null>(null);
  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      setMessage("Чат не найден");
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
        setMessage(data.error || "Не удалось загрузить сообщения");
        setLoading(false);
        return;
      }

      setChat(data.chat ?? null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setMessage("");
      await markChatAsRead();
    } catch {
      setMessage("Не удалось подключиться к серверу");
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
        setMessage(data.error || "Не удалось отправить сообщение");
        return;
      }

      setText("");
      await loadMessages();
    } catch {
      setMessage("Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(text);
  }

  useEffect(() => {
    loadCurrentUser();
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentUserId = currentUser?.id ?? currentUser?.userId ?? "";
  const isDriver = useMemo(() => {
    if (!chat || !currentUserId) return false;
    return chat.driverId === currentUserId;
  }, [chat, currentUserId]);

  const otherPersonName = useMemo(() => {
    if (!chat) return "Чат";
    if (isDriver) return chat.passenger?.name || "Пассажир";
    return chat.driver?.name || "Водитель";
  }, [chat, isDriver]);

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
      <div className="min-h-screen flex items-center justify-center bg-[#eef4f8]">
        <div className="text-lg text-[#35556c]">Загрузка чата...</div>
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
          <div className="mb-6 flex items-center justify-between">
            <a href="/" className="flex items-center">
              <img
                src="/gomate-logo.png"
                alt="GoMate"
                className="h-12 w-auto sm:h-14"
              />
            </a>

            <div className="hidden md:flex items-center gap-3">
              <a
                href="/trips"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                Поездки
              </a>
              <a
                href="/requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                Заявки
              </a>
              <a
                href="/chats"
                className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Чаты
              </a>
              <a
                href="/profile"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                Профиль
              </a>
            </div>
          </div>

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
                    {tripLabel || "Чат по поездке"}
                  </div>
                  {chat?.trip?.departureTime && (
                    <div className="mt-1 text-xs text-[#6b8495]">
                      Отправление: {formatDateTime(chat.trip.departureTime)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href="/chats"
                  className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm"
                >
                  Все чаты
                </a>

                {chat?.trip?.id && (
                  <a
                    href={`/trips/${chat.trip.id}`}
                    className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm"
                  >
                    Открыть поездку
                  </a>
                )}
              </div>
            </div>

            {message && (
              <div className="mx-5 mt-5 rounded-[20px] border border-white/80 bg-white/75 px-4 py-3 text-sm text-[#b42318] shadow-sm sm:mx-6">
                {message}
              </div>
            )}

            <div className="min-h-0 flex-1 px-4 py-4 sm:px-6">
              <div className="flex h-[52vh] flex-col gap-3 overflow-y-auto rounded-[24px] border border-white/70 bg-white/65 p-4 shadow-sm">
                {messages.length === 0 && (
                  <div className="my-auto text-center text-[#5d7485]">
                    Сообщений пока нет. Напиши первым.
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
                          {mine ? "Ты" : msg.sender?.name || "Пользователь"}
                        </div>

                        <div className="mt-1 whitespace-pre-wrap break-words text-sm sm:text-base">
                          {msg.text}
                        </div>

                        <div
                          className={`mt-2 text-[11px] ${
                            mine ? "text-white/80" : "text-[#8aa0af]"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-white/60 px-4 py-4 sm:px-6">
              <div className="mb-3 flex flex-wrap gap-2">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => sendMessage(emoji)}
                    disabled={sending}
                    className="flex h-11 min-w-[44px] items-center justify-center rounded-full border border-white/90 bg-white/88 px-3 text-xl shadow-sm transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Напиши сообщение..."
                  className="h-14 flex-1 rounded-[20px] border border-white/80 bg-white/88 px-4 text-[#173651] shadow-sm outline-none placeholder:text-[#7a94a5]"
                />

                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="flex h-14 items-center justify-center rounded-[20px] bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {sending ? "Отправка..." : "Отправить"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}