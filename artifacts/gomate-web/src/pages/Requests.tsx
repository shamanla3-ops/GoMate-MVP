import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";

type RequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "cancelled_by_driver"
  | "cancelled_by_passenger";

type IncomingRequest = {
  id: string;
  tripId: string;
  passengerId: string;
  seatsRequested: number;
  status: RequestStatus;
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
  passenger: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    rating?: number | null;
    phoneNumber?: string | null;
    age?: number | null;
  };
};

type OutgoingRequest = {
  id: string;
  tripId: string;
  passengerId: string;
  seatsRequested: number;
  status: RequestStatus;
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

type TabKey = "incoming" | "outgoing";
type ViewMode = "active" | "history";

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

function getStatusLabel(status: RequestStatus) {
  switch (status) {
    case "pending":
      return "Ожидает решения";
    case "accepted":
      return "Подтверждена";
    case "rejected":
      return "Отклонена";
    case "cancelled_by_driver":
      return "Поездка отменена водителем";
    case "cancelled_by_passenger":
      return "Отменена пассажиром";
    case "cancelled":
      return "Отменена";
    default:
      return status;
  }
}

function getStatusClasses(status: RequestStatus) {
  switch (status) {
    case "accepted":
      return "bg-[#dff7d4] text-[#24613a]";
    case "rejected":
      return "bg-[#fde7e7] text-[#9f2f2f]";
    case "cancelled_by_driver":
      return "bg-[#fff1df] text-[#9b5b12]";
    case "cancelled_by_passenger":
    case "cancelled":
      return "bg-[#eef1f4] text-[#5a7284]";
    case "pending":
    default:
      return "bg-[#fff6d8] text-[#8b6a14]";
  }
}

function isActiveStatus(status: RequestStatus) {
  return status === "pending" || status === "accepted";
}

function isHistoryStatus(status: RequestStatus) {
  return !isActiveStatus(status);
}

export default function Requests() {
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("incoming");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  async function loadRequests() {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const [incomingResponse, outgoingResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/trip-requests/incoming`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE_URL}/api/trip-requests/outgoing`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const incomingData = await incomingResponse.json();
      const outgoingData = await outgoingResponse.json();

      if (!incomingResponse.ok) {
        setMessage(incomingData.error || "Не удалось загрузить входящие заявки");
        setIncomingRequests([]);
      } else {
        setIncomingRequests(
          Array.isArray(incomingData.requests) ? incomingData.requests : []
        );
      }

      if (!outgoingResponse.ok) {
        setMessage((prev) => prev || outgoingData.error || "Не удалось загрузить мои заявки");
        setOutgoingRequests([]);
      } else {
        setOutgoingRequests(
          Array.isArray(outgoingData.requests) ? outgoingData.requests : []
        );
      }
    } catch {
      setMessage("Не удалось подключиться к серверу");
      setIncomingRequests([]);
      setOutgoingRequests([]);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    setLoading(true);
    loadRequests();
    loadChatUnreadCount();

    const interval = setInterval(() => {
      loadRequests();
      loadChatUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function handleIncomingAction(id: string, action: "accept" | "reject") {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setBusyId(id);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/trip-requests/${id}/${action}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Не удалось обновить заявку");
        return;
      }

      setIncomingRequests((prev) =>
        prev.map((request) => {
          if (request.id !== id) return request;

          if (action === "accept") {
            return {
              ...request,
              status: "accepted",
              trip: {
                ...request.trip,
                availableSeats: Math.max(
                  0,
                  request.trip.availableSeats - request.seatsRequested
                ),
              },
            };
          }

          return {
            ...request,
            status: "rejected",
          };
        })
      );
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelOutgoing(request: OutgoingRequest) {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const isAccepted = request.status === "accepted";
    const confirmed = window.confirm(
      isAccepted
        ? "Отменить участие в этой поездке?"
        : "Отменить заявку на эту поездку?"
    );

    if (!confirmed) return;

    setBusyId(request.id);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/trip-requests/${request.id}/cancel`,
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

      setOutgoingRequests((prev) =>
        prev.map((item) =>
          item.id === request.id
            ? { ...item, status: "cancelled_by_passenger" }
            : item
        )
      );
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteTrip(tripId: string) {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const confirmed = window.confirm(
      "Удалить эту поездку? Она исчезнет из общего списка, а пассажиры увидят, что поездка отменена водителем."
    );

    if (!confirmed) return;

    setDeletingTripId(tripId);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Не удалось удалить поездку");
        return;
      }

      setIncomingRequests((prev) =>
        prev.map((request) =>
          request.trip.id === tripId
            ? {
                ...request,
                status:
                  request.status === "pending" || request.status === "accepted"
                    ? "cancelled_by_driver"
                    : request.status,
                trip: {
                  ...request.trip,
                  status: "cancelled",
                },
              }
            : request
        )
      );

      setMessage("Поездка отменена водителем");
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setDeletingTripId(null);
    }
  }

  const incomingPendingCount = useMemo(
    () => incomingRequests.filter((request) => request.status === "pending").length,
    [incomingRequests]
  );

  const outgoingPendingCount = useMemo(
    () => outgoingRequests.filter((request) => request.status === "pending").length,
    [outgoingRequests]
  );

  const acceptedOutgoingCount = useMemo(
    () => outgoingRequests.filter((request) => request.status === "accepted").length,
    [outgoingRequests]
  );

  const incomingActiveCount = useMemo(
    () => incomingRequests.filter((request) => isActiveStatus(request.status)).length,
    [incomingRequests]
  );

  const incomingHistoryCount = useMemo(
    () => incomingRequests.filter((request) => isHistoryStatus(request.status)).length,
    [incomingRequests]
  );

  const outgoingActiveCount = useMemo(
    () => outgoingRequests.filter((request) => isActiveStatus(request.status)).length,
    [outgoingRequests]
  );

  const outgoingHistoryCount = useMemo(
    () => outgoingRequests.filter((request) => isHistoryStatus(request.status)).length,
    [outgoingRequests]
  );

  const visibleIncomingRequests = useMemo(() => {
    return incomingRequests.filter((request) =>
      viewMode === "active"
        ? isActiveStatus(request.status)
        : isHistoryStatus(request.status)
    );
  }, [incomingRequests, viewMode]);

  const visibleOutgoingRequests = useMemo(() => {
    return outgoingRequests.filter((request) =>
      viewMode === "active"
        ? isActiveStatus(request.status)
        : isHistoryStatus(request.status)
    );
  }, [outgoingRequests, viewMode]);

  const currentVisibleCount =
    activeTab === "incoming"
      ? visibleIncomingRequests.length
      : visibleOutgoingRequests.length;

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
                href="/templates"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                Маршруты
              </a>
              <a
                href="/requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                Заявки
                {incomingPendingCount + outgoingPendingCount > 0
                  ? ` (${incomingPendingCount + outgoingPendingCount})`
                  : ""}
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

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
                  Заявки
                </h1>
                <p className="mt-2 text-[#4a6678]">
                  Одна страница для водителя и пассажира: входящие и отправленные заявки вместе.
                </p>
              </div>

              <a
                href="/trips"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)]"
              >
                Найти поездку
              </a>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">Мне прислали</div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">
                  {incomingRequests.length}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">Ожидают решения</div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">
                  {incomingPendingCount + outgoingPendingCount}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">Подтверждено для меня</div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">
                  {acceptedOutgoingCount}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("incoming")}
                className={`rounded-full px-5 py-3 text-sm font-bold shadow-sm transition ${
                  activeTab === "incoming"
                    ? "bg-[#163c59] text-white"
                    : "bg-white/85 text-[#29485d]"
                }`}
              >
                Мне прислали
                {incomingPendingCount > 0 ? ` (${incomingPendingCount})` : ""}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("outgoing")}
                className={`rounded-full px-5 py-3 text-sm font-bold shadow-sm transition ${
                  activeTab === "outgoing"
                    ? "bg-[#163c59] text-white"
                    : "bg-white/85 text-[#29485d]"
                }`}
              >
                Мои отправленные
                {outgoingPendingCount > 0 ? ` (${outgoingPendingCount})` : ""}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setViewMode("active")}
                className={`rounded-full px-5 py-3 text-sm font-bold shadow-sm transition ${
                  viewMode === "active"
                    ? "bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] text-white"
                    : "bg-white/85 text-[#29485d]"
                }`}
              >
                Активные (
                {activeTab === "incoming" ? incomingActiveCount : outgoingActiveCount})
              </button>

              <button
                type="button"
                onClick={() => setViewMode("history")}
                className={`rounded-full px-5 py-3 text-sm font-bold shadow-sm transition ${
                  viewMode === "history"
                    ? "bg-[#163c59] text-white"
                    : "bg-white/85 text-[#29485d]"
                }`}
              >
                История (
                {activeTab === "incoming" ? incomingHistoryCount : outgoingHistoryCount})
              </button>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/80 bg-white/60 px-4 py-3 text-sm text-[#4a6678] shadow-sm">
              Сейчас показано: <span className="font-bold text-[#173651]">{currentVisibleCount}</span>
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

              {!loading &&
                activeTab === "incoming" &&
                visibleIncomingRequests.length === 0 && (
                  <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                    {viewMode === "active"
                      ? "У тебя нет активных входящих заявок."
                      : "История входящих заявок пока пустая."}
                  </div>
                )}

              {!loading &&
                activeTab === "outgoing" &&
                visibleOutgoingRequests.length === 0 && (
                  <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                    {viewMode === "active"
                      ? "У тебя нет активных отправленных заявок."
                      : "История отправленных заявок пока пустая."}
                  </div>
                )}

              {!loading &&
                activeTab === "incoming" &&
                visibleIncomingRequests.length > 0 && (
                  <div className="grid gap-5">
                    {visibleIncomingRequests.map((request) => {
                      const rating = request.passenger.rating ?? 0;
                      const tripTypeLabel =
                        request.trip.tripType === "regular" ? "Регулярная" : "Разовая";
                      const weekdaysLabel = formatWeekdays(request.trip.weekdays);

                      return (
                        <div
                          key={request.id}
                          className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex gap-4">
                              {request.passenger.avatarUrl ? (
                                <img
                                  src={request.passenger.avatarUrl}
                                  alt={request.passenger.name}
                                  className="h-16 w-16 rounded-full object-cover shadow-md ring-4 ring-white/80"
                                />
                              ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-xl font-extrabold text-white shadow-md ring-4 ring-white/80">
                                  {getInitials(request.passenger.name) || "G"}
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
                                  Пассажир:{" "}
                                  <span className="font-semibold text-[#173651]">
                                    {request.passenger.name}
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
                                  Запрошено мест: {request.seatsRequested}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Свободных мест сейчас: {request.trip.availableSeats} из{" "}
                                  {request.trip.seatsTotal}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  Телефон пассажира: {request.passenger.phoneNumber || "Не указан"}
                                </div>
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 lg:w-[260px]">
                              <a
                                href={`/trips/${request.trip.id}`}
                                className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm backdrop-blur-sm"
                              >
                                Открыть поездку
                              </a>

                              {request.trip.status !== "cancelled" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTrip(request.trip.id)}
                                  disabled={deletingTripId === request.trip.id}
                                  className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-[#c62828] shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {deletingTripId === request.trip.id ? "Удаление..." : "Удалить поездку"}
                                </button>
                              )}

                              {request.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleIncomingAction(request.id, "accept")}
                                    disabled={busyId === request.id}
                                    className="flex h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {busyId === request.id ? "Обработка..." : "Принять"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleIncomingAction(request.id, "reject")}
                                    disabled={busyId === request.id}
                                    className="flex h-12 items-center justify-center rounded-full bg-[#163c59] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {busyId === request.id ? "Обработка..." : "Отклонить"}
                                  </button>
                                </>
                              )}

                              {request.status === "accepted" && (
                                <div className="rounded-[20px] border border-[#ccecbf] bg-[#f4fff0] px-4 py-3 text-sm font-semibold text-[#24613a] shadow-sm">
                                  Заявка подтверждена.
                                </div>
                              )}

                              {request.status === "rejected" && (
                                <div className="rounded-[20px] border border-[#f4d4d4] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f2f2f] shadow-sm">
                                  Заявка отклонена.
                                </div>
                              )}

                              {request.status === "cancelled_by_passenger" && (
                                <div className="rounded-[20px] border border-[#d9e2ea] bg-[#f7fbfd] px-4 py-3 text-sm text-[#5d7485] shadow-sm">
                                  Пассажир отменил заявку.
                                </div>
                              )}

                              {request.status === "cancelled_by_driver" && (
                                <div className="rounded-[20px] border border-[#fbe1bf] bg-[#fff6ea] px-4 py-3 text-sm text-[#9b5b12] shadow-sm">
                                  Поездка была отменена водителем.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              {!loading &&
                activeTab === "outgoing" &&
                visibleOutgoingRequests.length > 0 && (
                  <div className="grid gap-5">
                    {visibleOutgoingRequests.map((request) => {
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
                                      Водитель одобрил поездку. Можно уточнить детали напрямую.
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

                              <div className="flex w-full flex-col gap-3 lg:w-[260px]">
                                <a
                                  href={`/trips/${request.trip.id}`}
                                  className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm backdrop-blur-sm"
                                >
                                  Открыть поездку
                                </a>

                                {(request.status === "pending" || request.status === "accepted") && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelOutgoing(request)}
                                    disabled={busyId === request.id}
                                    className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-[#c62828] shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {busyId === request.id
                                      ? "Отмена..."
                                      : request.status === "accepted"
                                      ? "Отменить участие"
                                      : "Отменить заявку"}
                                  </button>
                                )}

                                {request.status === "rejected" && (
                                  <div className="rounded-[20px] border border-[#f4d4d4] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f2f2f] shadow-sm">
                                    Водитель отклонил заявку.
                                  </div>
                                )}

                                {request.status === "cancelled_by_passenger" && (
                                  <div className="rounded-[20px] border border-[#d9e2ea] bg-[#f7fbfd] px-4 py-3 text-sm text-[#5d7485] shadow-sm">
                                    Ты отменил эту заявку.
                                  </div>
                                )}

                                {request.status === "cancelled_by_driver" && (
                                  <div className="rounded-[20px] border border-[#fbe1bf] bg-[#fff6ea] px-4 py-3 text-sm text-[#9b5b12] shadow-sm">
                                    Поездка была удалена водителем.
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

            <a
              href="/create-trip"
              className="-mt-6 flex flex-col items-center gap-1"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-[34px] text-white shadow-[0_10px_20px_rgba(31,145,140,0.35)]">
                +
              </span>
            </a>

            <a href="/requests" className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">📩</span>
              <span>Заявки</span>
            </a>

            <a
              href="/chats"
              className="flex flex-col items-center gap-1 font-semibold text-[#18a04f]"
            >
              <span className="text-[18px] leading-none">💬</span>
              <span>Чаты</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}