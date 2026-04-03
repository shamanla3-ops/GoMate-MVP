import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { getCurrentUser } from "../lib/auth";

type CurrentUserLike = {
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
};

type Driver = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  rating?: number | null;
  phoneNumber?: string | null;
  age?: number | null;
  carBrand?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carPlateNumber?: string | null;
  co2SavedKg?: number | null;
};

type TripDetailsData = {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  departureTime: string;
  seatsTotal: number;
  availableSeats: number;
  price: number;
  currency: "EUR" | "USD" | "PLN";
  tripType: "one-time" | "regular";
  weekdays?: string[] | null;
  status: string;
  createdAt: string;
  estimatedCo2SavingKg: number;
  driver: Driver;
};

type ChatSummary = {
  id: string;
  unreadCount: number;
};

const WEEKDAY_LABELS: Record<string, string> = {
  mon: "Пн",
  tue: "Вт",
  wed: "Ср",
  thu: "Чт",
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

function formatPrice(price: number, currency: "EUR" | "USD" | "PLN") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(price / 100);
}

function formatWeekdays(weekdays: string[] | null | undefined): string {
  if (!weekdays || weekdays.length === 0) return "";

  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const sorted = [...weekdays].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );

  return sorted.map((day) => WEEKDAY_LABELS[day] ?? day).join(", ");
}

function formatDepartureTime(value: string) {
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

function renderStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, rating));
  return Array.from({ length: 5 }, (_, index) =>
    index < safeRating ? "★" : "☆"
  ).join(" ");
}

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TripDetails() {
  const { id } = useParams();
  const [trip, setTrip] = useState<TripDetailsData | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [openingChat, setOpeningChat] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  async function loadTrip() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/trips/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Не удалось загрузить поездку");
        setTrip(null);
        return;
      }

      setTrip(data.trip ?? null);
      setMessage("");
    } catch {
      setMessage("Не удалось подключиться к серверу");
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentUser() {
    const user = (await getCurrentUser()) as CurrentUserLike | null;
    setCurrentUser(user);
  }

  async function loadChatUnreadCount() {
    const token = localStorage.getItem("token");

    if (!token) {
      setChatUnreadCount(0);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/trip-chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setChatUnreadCount(0);
        return;
      }

      const data = await response.json();
      const chats = Array.isArray(data.chats) ? (data.chats as ChatSummary[]) : [];
      const total = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      setChatUnreadCount(total);
    } catch {
      setChatUnreadCount(0);
    }
  }

  async function handleChat() {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!trip) {
      return;
    }

    try {
      setOpeningChat(true);

      const res = await fetch(`${API_BASE_URL}/api/trip-chats/by-trip/${trip.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Ошибка создания чата");
        return;
      }

      window.location.href = `/chat/${data.chat.id}`;
    } catch {
      alert("Ошибка соединения");
    } finally {
      setOpeningChat(false);
    }
  }

  useEffect(() => {
    loadTrip();
    loadCurrentUser();
    loadChatUnreadCount();

    const interval = setInterval(() => {
      loadChatUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  const currentUserId = currentUser?.id ?? currentUser?.userId ?? "";
  const isOwnTrip = useMemo(() => {
    if (!trip || !currentUserId) return false;
    return trip.driverId === currentUserId;
  }, [trip, currentUserId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef4f8]">
        <div className="text-lg text-[#35556c]">Загрузка поездки...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef4f8] px-4">
        <div className="rounded-[24px] border border-white/80 bg-white/80 px-6 py-5 text-[#b42318] shadow-sm">
          {message || "Поездка не найдена"}
        </div>
      </div>
    );
  }

  const rating = trip.driver.rating ?? 0;
  const weekdaysLabel = formatWeekdays(trip.weekdays);
  const carInfo = [trip.driver.carBrand, trip.driver.carModel, trip.driver.carColor]
    .filter(Boolean)
    .join(", ");

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
                Чаты{chatUnreadCount > 0 ? ` (${chatUnreadCount})` : ""}
              </a>
              <a
                href="/profile"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                Профиль
              </a>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
                    {trip.origin} → {trip.destination}
                  </h1>

                  <span className="rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-4 py-2 text-xs font-bold text-white shadow-sm">
                    {trip.tripType === "regular" ? "Регулярная" : "Разовая"}
                  </span>

                  {trip.status !== "scheduled" && (
                    <span className="rounded-full bg-[#fff1df] px-4 py-2 text-xs font-bold text-[#9b5b12] shadow-sm">
                      {trip.status}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-[#4a6678]">
                  Подробности поездки, водитель, авто, цена и быстрый переход в чат.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:w-[260px]">
                <a
                  href="/trips"
                  className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-6 text-sm font-semibold text-[#29485d] shadow-sm"
                >
                  Назад к поездкам
                </a>

                {!isOwnTrip && (
                  <button
                    type="button"
                    onClick={handleChat}
                    disabled={openingChat}
                    className="flex h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {openingChat ? "Открываем чат..." : "Написать водителю"}
                  </button>
                )}

                {isOwnTrip && (
                  <a
                    href="/chats"
                    className="flex h-12 items-center justify-center rounded-full bg-[#163c59] px-6 text-sm font-bold text-white shadow-sm"
                  >
                    Открыть чаты
                  </a>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm">
                <h2 className="text-xl font-extrabold text-[#173651]">Информация о поездке</h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <DetailCard
                    label="Отправление"
                    value={formatDepartureTime(trip.departureTime)}
                  />
                  <DetailCard
                    label="Цена за место"
                    value={formatPrice(trip.price, trip.currency)}
                  />
                  <DetailCard
                    label="Свободно мест"
                    value={`${trip.availableSeats} из ${trip.seatsTotal}`}
                  />
                  <DetailCard
                    label="Экономия CO₂"
                    value={`${trip.estimatedCo2SavingKg} кг`}
                  />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailCard
                    label="Тип поездки"
                    value={trip.tripType === "regular" ? "Регулярная" : "Разовая"}
                  />
                  <DetailCard
                    label="Дни"
                    value={weekdaysLabel || "Не указаны"}
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm">
                <h2 className="text-xl font-extrabold text-[#173651]">Водитель</h2>

                <div className="mt-5 flex gap-4">
                  {trip.driver.avatarUrl ? (
                    <img
                      src={trip.driver.avatarUrl}
                      alt={trip.driver.name}
                      className="h-20 w-20 rounded-full object-cover ring-4 ring-white/80"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-2xl font-extrabold text-white ring-4 ring-white/80">
                      {getInitials(trip.driver.name) || "G"}
                    </div>
                  )}

                  <div>
                    <div className="text-2xl font-extrabold text-[#173651]">
                      {trip.driver.name}
                    </div>
                    <div className="mt-1 text-sm text-[#f4b400]">
                      {renderStars(rating)}
                      <span className="ml-2 text-[#4a6678]">{rating} из 5</span>
                    </div>
                    <div className="mt-2 text-sm text-[#4a6678]">
                      Возраст: {trip.driver.age ?? "Не указан"}
                    </div>
                    <div className="mt-1 text-sm text-[#4a6678]">
                      Телефон: {trip.driver.phoneNumber || "Станет доступен после подтверждения / в чате"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <DetailCard
                    label="Автомобиль"
                    value={carInfo || "Не указано"}
                  />
                  <DetailCard
                    label="Номер авто"
                    value={trip.driver.carPlateNumber || "Не указан"}
                  />
                </div>
              </div>
            </div>

            {message && (
              <div className="mt-6 rounded-[20px] border border-white/80 bg-white/75 px-4 py-3 text-sm text-[#28475d] shadow-sm">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#f7fbfd] p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#6f8798]">
        {label}
      </div>
      <div className="mt-2 text-base font-bold text-[#1f3548]">{value}</div>
    </div>
  );
}