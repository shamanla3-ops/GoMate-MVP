import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { formatDateTimeChatList } from "../lib/intlLocale";

type CurrentUserLike = {
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
};

type ChatItem = {
  id: string;
  tripId: string;
  driverId: string;
  passengerId: string;
  driverLastReadAt?: string | null;
  passengerLastReadAt?: string | null;
  createdAt: string;
  unreadCount: number;
  trip: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
    status: string;
  } | null;
  driver: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    rating?: number | null;
    phoneNumber?: string | null;
  } | null;
  passenger: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    rating?: number | null;
    phoneNumber?: string | null;
  } | null;
  lastMessage: {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    createdAt: string;
  } | null;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Chats() {
  const { t, locale } = useTranslation();
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const [currentUser, setCurrentUser] = useState<CurrentUserLike | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);

  async function loadCurrentUser() {
    const user = (await getCurrentUser()) as CurrentUserLike | null;
    setCurrentUser(user);
  }

  async function loadChats() {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/trip-chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || t("chatsPage.loadError"));
        setChats([]);
        setTotalUnread(0);
        return;
      }

      setChats(Array.isArray(data.chats) ? data.chats : []);
      setTotalUnread(typeof data.totalUnread === "number" ? data.totalUnread : 0);
      setMessage("");
    } catch {
      setMessage(t("chatsPage.serverError"));
      setChats([]);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
    loadChats();
    void refreshNotificationCounts();

    const interval = setInterval(() => {
      loadChats();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshNotificationCounts]);

  const currentUserId = currentUser?.id ?? currentUser?.userId ?? "";

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : new Date(a.createdAt).getTime();

      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : new Date(b.createdAt).getTime();

      return bTime - aTime;
    });
  }, [chats]);

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

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
          <AppPageHeader>
            <div className="hidden md:flex items-center gap-3">
              <a
                href="/trips"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("chatsPage.navTrips")}
              </a>
              <a
                href="/requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("chatsPage.navRequests")}
              </a>
              <a
                href="/chats"
                className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                {t("chatsPage.navChats")}
                {totalUnread > 0 ? ` (${totalUnread})` : ""}
              </a>
              <a
                href="/profile"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("chatsPage.navProfile")}
              </a>
            </div>
          </AppPageHeader>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
                  {t("chatsPage.title")}
                </h1>
                <p className="mt-2 text-[#4a6678]">{t("chatsPage.subtitle")}</p>
              </div>

              <div className="rounded-[22px] border border-white/80 bg-white/75 px-5 py-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#6f8798]">
                  {t("chatsPage.unread")}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-[#173651]">
                  {totalUnread}
                </div>
              </div>
            </div>

            <div className="mt-6">
              {loading && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  {t("chatsPage.loading")}
                </div>
              )}

              {!loading && message && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#b42318] shadow-sm">
                  {message}
                </div>
              )}

              {!loading && !message && sortedChats.length === 0 && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  {t("chatsPage.empty")}
                </div>
              )}

              {!loading && sortedChats.length > 0 && (
                <div className="grid gap-4">
                  {sortedChats.map((chat) => {
                    const isDriver = chat.driverId === currentUserId;
                    const otherPerson = isDriver ? chat.passenger : chat.driver;
                    const title = chat.trip
                      ? `${chat.trip.origin} → ${chat.trip.destination}`
                      : t("chatsPage.trip");
                    const subtitle = isDriver
                      ? `${t("chatsPage.passenger")} ${otherPerson?.name || t("chatsPage.user")}`
                      : `${t("chatsPage.driver")} ${otherPerson?.name || t("chatsPage.user")}`;

                    return (
                      <a
                        key={chat.id}
                        href={`/chat/${chat.id}`}
                        className="rounded-[26px] border border-white/80 bg-white/80 p-5 shadow-sm transition hover:scale-[1.01]"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex gap-4">
                            {otherPerson?.avatarUrl ? (
                              <img
                                src={otherPerson.avatarUrl}
                                alt={otherPerson.name}
                                className="h-16 w-16 rounded-full object-cover ring-4 ring-white/80"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-xl font-extrabold text-white ring-4 ring-white/80">
                                {getInitials(otherPerson?.name || "G")}
                              </div>
                            )}

                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-2xl font-extrabold text-[#173651]">
                                  {title}
                                </h2>

                                {chat.unreadCount > 0 && (
                                  <span className="rounded-full bg-[#163c59] px-3 py-1 text-xs font-bold text-white shadow-sm">
                                    {t("chatsPage.newMessages")} {chat.unreadCount}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 text-sm font-semibold text-[#35556c]">
                                {subtitle}
                              </div>

                              <div className="mt-2 text-sm text-[#5d7485]">
                                {chat.lastMessage
                                  ? `${t("chatsPage.lastMessage")} ${chat.lastMessage.text}`
                                  : t("chatsPage.noMessagesYet")}
                              </div>

                              <div className="mt-1 text-xs text-[#7a94a5]">
                                {chat.lastMessage?.createdAt
                                  ? formatDateTimeChatList(
                                      chat.lastMessage.createdAt,
                                      locale
                                    )
                                  : formatDateTimeChatList(chat.createdAt, locale)}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center">
                            <span className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#29485d] shadow-sm">
                              {t("chatsPage.openChat")}
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
