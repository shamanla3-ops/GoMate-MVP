import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";

type OutgoingRequest = {
  id: string;
  tripId: string;
  passengerId: string;
  seatsRequested: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
  trip: {
    id: string;
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
  };
  driver: {
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
  };
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

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function renderStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, rating));
  return Array.from({ length: 5 }, (_, index) =>
    index < safeRating ? "★" : "☆"
  ).join(" ");
}

function formatPrice(price: number, currency: "EUR" | "USD" | "PLN") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(price / 100);
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

function formatWeekdays(weekdays: string[] | null | undefined): string {
  if (!weekdays || weekdays.length === 0) return "";

  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const sorted = [...weekdays].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );

  return sorted.map((day) => WEEKDAY_LABELS[day] ?? day).join(", ");
}

function getStatusLabel(status: OutgoingRequest["status"]) {
  switch (status) {
    case "pending":
      return "Ожидает решения";
    case "accepted":
      return "Подтверждена";
    case "rejected":
      return "Отклонена";
    case "cancelled":
      return "Отменена";
    default:
      return status;
  }
}

function getStatusClasses(status: OutgoingRequest["status"]) {
  switch (status) {
    case "accepted":
      return "bg-[#dff7d4] text-[#24613a]";
    case "rejected":
      return "bg-[#fde7e7] text-[#9f2f2f]";
    case "cancelled":
      return "bg-[#eef1f4] text-[#5a7284]";
    case "pending":
    default:
      return "bg-[#fff6d8] text-[#8b6a14]";
  }
}

export default function MyRequests() {
  const [requests, setRequests] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadRequests() {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/trip-requests/outgoing`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Не удалось загрузить мои заявки");
        setRequests([]);
        return;
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      setMessage("Не удалось подключиться к серверу");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleCancel(requestId: string) {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setBusyId(requestId);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/trip-requests/${requestId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Не удалось отменить заявку");
        return;
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === requestId ? { ...item, status: "cancelled" } : item
        )
      );
      setMessage("Заявка отменена");
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  );

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

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
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
                href="/driver-requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                Входящие заявки
              </a>
              <a
                href="/my-requests"
                className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Мои заявки{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </a>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
                  Исходящие заявки
                </h1>
                <p className="mt-2 text-[#4a6678]">
                  Здесь пассажир видит все отправленные заявки и их текущий статус.
                </p>
              </div>

              <a
                href="/trips"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)]"
              >
                Найти ещё поездку
              </a>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">Всего заявок</div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">{requests.length}</div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">Ожидают решения</div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">{pendingCount}</div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">Подтверждено</div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">
                  {requests.filter((request) => request.status === "accepted").length}
                </div>
              </div>
            </div>

            <div className="mt-6">
              {loading && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  Загрузка заявок...
                </div>
              )}

              {!loading && message && (
                <div className="mb-4 rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#28475d] shadow-sm">
                  {message}
                </div>
              )}

              {!loading && requests.length === 0 && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  У тебя пока нет отправленных заявок.
                </div>
              )}

              {!loading && requests.length > 0 && (
                <div className="grid gap-5">
                  {requests.map((request) => {
                    const rating = request.driver.rating ?? 0;
                    const tripTypeLabel =
                      request.trip.tripType === "regular" ? "Регулярная" : "Разовая";
                    const weekdaysLabel = formatWeekdays(request.trip.weekdays);
                    const carInfo = [
                      request.driver.carBrand,
                      request.driver.carModel,
                      request.driver.carColor,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <div
                        key={request.id}
                        className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
                      >
                        <div className="flex flex-col gap-5">
                          {request.status === "accepted" && (
                            <div className="rounded-[26px] border border-[#ccecbf] bg-[linear-gradient(135deg,#e9f9df_0%,#f4fff0_45%,#ecfbf2_100%)] p-5 shadow-sm">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <div className="text-sm font-bold uppercase tracking-[0.18em] text-[#2d8042]">
                                    Заявка подтверждена
                                  </div>
                                  <h3 className="mt-2 text-2xl font-extrabold text-[#1f5d34]">
                                    Свяжись с водителем
                                  </h3>
                                  <p className="mt-2 text-sm text-[#467257]">
                                    Водитель одобрил поездку. Теперь можно быстро связаться и уточнить детали.
                                  </p>
                                </div>

                                <div className="rounded-[22px] bg-white/90 px-5 py-4 shadow-sm">
                                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#658675]">
                                    Телефон водителя
                                  </div>
                                  <div className="mt-2 text-2xl font-extrabold text-[#173651]">
                                    {request.driver.phoneNumber || "Не указан"}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-[20px] bg-white/80 p-4 shadow-sm">
                                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7f70]">
                                    Водитель
                                  </div>
                                  <div className="mt-2 text-lg font-bold text-[#173651]">
                                    {request.driver.name}
                                  </div>
                                </div>

                                <div className="rounded-[20px] bg-white/80 p-4 shadow-sm">
                                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7f70]">
                                    Автомобиль
                                  </div>
                                  <div className="mt-2 text-lg font-bold text-[#173651]">
                                    {carInfo || "Не указано"}
                                  </div>
                                </div>

                                <div className="rounded-[20px] bg-white/80 p-4 shadow-sm">
                                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7f70]">
                                    Номер авто
                                  </div>
                                  <div className="mt-2 text-lg font-bold text-[#173651]">
                                    {request.driver.carPlateNumber || "Не указан"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex gap-4">
                              {request.driver.avatarUrl ? (
                                <img
                                  src={request.driver.avatarUrl}
                                  alt={request.driver.name}
                                  className="h-16 w-16 rounded-full object-cover shadow-md ring-4 ring-white/80"
                                />
                              ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-xl font-extrabold text-white shadow-md ring-4 ring-white/80">
                                  {getInitials(request.driver.name) || "G"}
                                </div>
                              )}

                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <h2 className="text-2xl font-extrabold text-[#173651]">
                                    {request.trip.origin} → {request.trip.destination}
                                  </h2>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                                      request.status
                                    )}`}
                                  >
                                    {getStatusLabel(request.status)}
                                  </span>
                                </div>

                                <div className="mt-2 text-sm text-[#4a6678]">
                                  Водитель:{" "}
                                  <span className="font-semibold text-[#173651]">
                                    {request.driver.name}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-[#f4b400]">
                                  {renderStars(rating)}
                                  <span className="ml-2 text-[#4a6678]">{rating} из 5</span>
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Отправление: {formatDepartureTime(request.trip.departureTime)}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Тип поездки: {tripTypeLabel}
                                  {weekdaysLabel ? ` • ${weekdaysLabel}` : ""}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Мест в заявке: {request.seatsRequested}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Цена за место: {formatPrice(request.trip.price, request.trip.currency)}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Свободных мест сейчас: {request.trip.availableSeats} из{" "}
                                  {request.trip.seatsTotal}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Авто: {carInfo || "Не указано"}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Номер: {request.driver.carPlateNumber || "Не указан"}
                                </div>

                                {request.status === "accepted" && request.driver.phoneNumber && (
                                  <div className="mt-3 inline-flex rounded-full bg-[#e6f7dd] px-4 py-2 text-sm font-bold text-[#24613a]">
                                    Телефон для связи: {request.driver.phoneNumber}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 lg:w-[240px]">
                              <a
                                href={`/trips/${request.trip.id}`}
                                className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm backdrop-blur-sm"
                              >
                                Открыть поездку
                              </a>

                              {request.status === "pending" && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(request.id)}
                                  disabled={busyId === request.id}
                                  className="flex h-12 items-center justify-center rounded-full bg-[#163c59] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {busyId === request.id ? "Отмена..." : "Отменить заявку"}
                                </button>
                              )}

                              {request.status === "rejected" && (
                                <div className="rounded-[20px] border border-[#f4d4d4] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f2f2f] shadow-sm">
                                  Водитель отклонил заявку.
                                </div>
                              )}

                              {request.status === "cancelled" && (
                                <div className="rounded-[20px] border border-[#d9e2ea] bg-[#f7fbfd] px-4 py-3 text-sm text-[#5d7485] shadow-sm">
                                  Ты отменил эту заявку.
                                </div>
                              )}

                              {request.status === "accepted" && (
                                <div className="rounded-[20px] border border-[#ccecbf] bg-[#f4fff0] px-4 py-3 text-sm font-semibold text-[#24613a] shadow-sm">
                                  Поездка подтверждена. Свяжись с водителем.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/70 bg-white/88 backdrop-blur-md md:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-5 items-end px-3 pb-3 pt-2 text-center text-[11px] text-[#4d697c]">
            <a href="/" className="flex flex-col items-center gap-1">
              <span className="text-[22px] leading-none">⌂</span>
              <span>Главная</span>
            </a>

            <a href="/trips" className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">🧳</span>
              <span>Поездки</span>
            </a>

            <a href="/driver-requests" className="-mt-6 flex flex-col items-center gap-1">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-[22px] text-white shadow-[0_10px_20px_rgba(31,145,140,0.35)]">
                📩
              </span>
            </a>

            <a href="/my-requests" className="flex flex-col items-center gap-1 font-semibold text-[#18a04f]">
              <span className="text-[18px] leading-none">✅</span>
              <span>Мои</span>
            </a>

            <a href="/profile" className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">👤</span>
              <span>Профиль</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}