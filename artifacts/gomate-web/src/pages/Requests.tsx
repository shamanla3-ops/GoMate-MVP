import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { useSound } from "../context/SoundContext";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import {
  RideMatchModal,
  type RideMatchModalPayload,
} from "../components/rideMatch/RideMatchModal";
import { formatDateTimeShort } from "../lib/intlLocale";
import { messageFromApiError } from "../lib/errorMessages";
import { messageFromApiSuccess } from "../lib/successMessages";
import { isDepartureStrictlyPast } from "../lib/tripDeparture";
import {
  consumeMatchCelebrationOnce,
  consumeNewIncomingPendingRequestIds,
  consumePendingToAcceptedOutgoing,
} from "../lib/rideEventFeedback";

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

function formatWeekdays(
  weekdays: string[] | null | undefined,
  t: (key: string) => string
): string {
  if (!weekdays || weekdays.length === 0) return "";

  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const sorted = [...weekdays].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );

  return sorted.map((day) => t(`weekday.${day}`)).join(", ");
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

function isLifecycleActiveStatus(status: RequestStatus) {
  return status === "pending" || status === "accepted";
}

/** Active tab: pending/accepted and trip departure not strictly in the past. */
function isRequestInActiveTab(
  status: RequestStatus,
  departureIso: string,
  nowMs: number
) {
  if (!isLifecycleActiveStatus(status)) return false;
  return !isDepartureStrictlyPast(departureIso, nowMs);
}

/** History tab: terminal lifecycle OR pending/accepted but departure already passed. */
function isRequestInHistoryTab(
  status: RequestStatus,
  departureIso: string,
  nowMs: number
) {
  if (!isLifecycleActiveStatus(status)) return true;
  return isDepartureStrictlyPast(departureIso, nowMs);
}

export default function Requests() {
  const { t, locale } = useTranslation();
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const { playNewRideRequest, playRequestApproved, playRideMatch } = useSound();

  function statusLabel(status: RequestStatus) {
    return t(`requests.status.${status}`);
  }
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("incoming");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pulseIncomingId, setPulseIncomingId] = useState<string | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchPayload, setMatchPayload] = useState<RideMatchModalPayload | null>(null);

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
        setMessage(
          messageFromApiError(incomingData, t, "requestsPage.loadIncomingError")
        );
        setIncomingRequests([]);
      } else {
        setIncomingRequests(
          Array.isArray(incomingData.requests) ? incomingData.requests : []
        );
      }

      if (!outgoingResponse.ok) {
        setMessage((prev) =>
          prev ||
          messageFromApiError(outgoingData, t, "requestsPage.loadOutgoingError")
        );
        setOutgoingRequests([]);
      } else {
        setOutgoingRequests(
          Array.isArray(outgoingData.requests) ? outgoingData.requests : []
        );
      }
    } catch {
      setMessage(t("requestsPage.serverError"));
      setIncomingRequests([]);
      setOutgoingRequests([]);
    } finally {
      setNowMs(Date.now());
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
    void refreshNotificationCounts();

    const interval = setInterval(() => {
      loadRequests();
      loadChatUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshNotificationCounts]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;
    const pendingIds = incomingRequests
      .filter((request) => request.status === "pending")
      .map((request) => request.id);
    const newIds = consumeNewIncomingPendingRequestIds(pendingIds);
    if (newIds.length > 0) {
      playNewRideRequest();
      const focusId = newIds[newIds.length - 1]!;
      setPulseIncomingId(focusId);
      window.setTimeout(() => {
        setPulseIncomingId((current) => (current === focusId ? null : current));
      }, 4200);
    }
  }, [incomingRequests, loading, playNewRideRequest]);

  useEffect(() => {
    if (loading) return;
    const hits = consumePendingToAcceptedOutgoing(
      outgoingRequests.map((r) => ({ id: r.id, status: r.status }))
    );
    for (const id of hits) {
      if (!consumeMatchCelebrationOnce(id)) continue;
      const req = outgoingRequests.find((r) => r.id === id);
      if (!req || req.status !== "accepted") continue;
      playRequestApproved();
      window.setTimeout(() => playRideMatch(), 200);
      setMatchPayload({
        requestId: req.id,
        tripId: req.trip.id,
        origin: req.trip.origin,
        destination: req.trip.destination,
        driverName: req.driver.name,
      });
      setMatchOpen(true);
      break;
    }
  }, [outgoingRequests, loading, playRequestApproved, playRideMatch]);

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
        setMessage(messageFromApiError(data, t, "requestsPage.updateError"));
        return;
      }

      setMessage(
        messageFromApiSuccess(
          data,
          t,
          action === "accept"
            ? "requestsPage.incomingAcceptedNote"
            : "requestsPage.incomingRejectedNote"
        )
      );

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
      setMessage(t("requestsPage.serverError"));
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
        ? t("requestsPage.cancelOutgoingAccepted")
        : t("requestsPage.cancelOutgoingPending")
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
        setMessage(messageFromApiError(data, t, "requestsPage.cancelError"));
        return;
      }

      setMessage(messageFromApiSuccess(data, t, "myRequestsPage.cancelled"));

      setOutgoingRequests((prev) =>
        prev.map((item) =>
          item.id === request.id
            ? { ...item, status: "cancelled_by_passenger" }
            : item
        )
      );
    } catch {
      setMessage(t("requestsPage.serverError"));
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

    const confirmed = window.confirm(t("requestsPage.deleteTripConfirm"));

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
        setMessage(messageFromApiError(data, t, "requestsPage.deleteTripError"));
        return;
      }

      setMessage(
        messageFromApiSuccess(data, t, "requestsPage.tripCancelledByDriver")
      );

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
    } catch {
      setMessage(t("requestsPage.serverError"));
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
    () =>
      incomingRequests.filter((request) =>
        isRequestInActiveTab(request.status, request.trip.departureTime, nowMs)
      ).length,
    [incomingRequests, nowMs]
  );

  const incomingHistoryCount = useMemo(
    () =>
      incomingRequests.filter((request) =>
        isRequestInHistoryTab(request.status, request.trip.departureTime, nowMs)
      ).length,
    [incomingRequests, nowMs]
  );

  const outgoingActiveCount = useMemo(
    () =>
      outgoingRequests.filter((request) =>
        isRequestInActiveTab(request.status, request.trip.departureTime, nowMs)
      ).length,
    [outgoingRequests, nowMs]
  );

  const outgoingHistoryCount = useMemo(
    () =>
      outgoingRequests.filter((request) =>
        isRequestInHistoryTab(request.status, request.trip.departureTime, nowMs)
      ).length,
    [outgoingRequests, nowMs]
  );

  const visibleIncomingRequests = useMemo(() => {
    return incomingRequests.filter((request) =>
      viewMode === "active"
        ? isRequestInActiveTab(request.status, request.trip.departureTime, nowMs)
        : isRequestInHistoryTab(request.status, request.trip.departureTime, nowMs)
    );
  }, [incomingRequests, viewMode, nowMs]);

  const visibleOutgoingRequests = useMemo(() => {
    return outgoingRequests.filter((request) =>
      viewMode === "active"
        ? isRequestInActiveTab(request.status, request.trip.departureTime, nowMs)
        : isRequestInHistoryTab(request.status, request.trip.departureTime, nowMs)
    );
  }, [outgoingRequests, viewMode, nowMs]);

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
          <AppPageHeader>
            <div className="hidden md:flex items-center gap-3">
              <a
                href="/trips"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("requestsPage.navTrips")}
              </a>
              <a
                href="/templates"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("requestsPage.navTemplates")}
              </a>
              <a
                href="/requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("requestsPage.navRequests")}
                {incomingPendingCount + outgoingPendingCount > 0
                  ? ` (${incomingPendingCount + outgoingPendingCount})`
                  : ""}
              </a>
              <a
                href="/chats"
                className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                {t("requestsPage.navChats")}
                {chatUnreadCount > 0 ? ` (${chatUnreadCount})` : ""}
              </a>
              <a
                href="/profile"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("requestsPage.navProfile")}
              </a>
            </div>
          </AppPageHeader>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
                  {t("requestsPage.title")}
                </h1>
                <p className="mt-2 text-[#4a6678]">{t("requestsPage.subtitle")}</p>
              </div>

              <a
                href="/trips"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)]"
              >
                {t("requestsPage.findTrip")}
              </a>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">
                  {t("requestsPage.statSentToMe")}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">
                  {incomingRequests.length}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">
                  {t("requestsPage.statPending")}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">
                  {incomingPendingCount + outgoingPendingCount}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">
                  {t("requestsPage.statConfirmedForMe")}
                </div>
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
                {t("requestsPage.tabIncoming")}
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
                {t("requestsPage.tabOutgoing")}
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
                {t("requestsPage.viewActive")} (
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
                {t("requestsPage.viewHistory")} (
                {activeTab === "incoming" ? incomingHistoryCount : outgoingHistoryCount})
              </button>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/80 bg-white/60 px-4 py-3 text-sm text-[#4a6678] shadow-sm">
              {t("requestsPage.showingCount")}{" "}
              <span className="font-bold text-[#173651]">{currentVisibleCount}</span>
            </div>

            <div className="mt-6">
              {loading && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  {t("requestsPage.loading")}
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
                      ? t("requestsPage.emptyIncomingActive")
                      : t("requestsPage.emptyIncomingHistory")}
                  </div>
                )}

              {!loading &&
                activeTab === "outgoing" &&
                visibleOutgoingRequests.length === 0 && (
                  <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                    {viewMode === "active"
                      ? t("requestsPage.emptyOutgoingActive")
                      : t("requestsPage.emptyOutgoingHistory")}
                  </div>
                )}

              {!loading &&
                activeTab === "incoming" &&
                visibleIncomingRequests.length > 0 && (
                  <div className="grid gap-5">
                    {visibleIncomingRequests.map((request) => {
                      const rating = request.passenger.rating ?? 0;
                      const tripTypeLabel =
                        request.trip.tripType === "regular"
                          ? t("common.tripTypeRegular")
                          : t("common.tripTypeOneTime");
                      const weekdaysLabel = formatWeekdays(request.trip.weekdays, t);

                      return (
                        <div
                          key={request.id}
                          className={`rounded-[28px] border bg-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-shadow duration-500 ${
                            pulseIncomingId === request.id
                              ? "border-[#1296e8]/55 ring-2 ring-[#1296e8]/35 ring-offset-2 ring-offset-[#eef4f8]"
                              : "border-white/70"
                          }`}
                          aria-label={
                            pulseIncomingId === request.id
                              ? t("driverRequestsPage.newRequestHighlightAria")
                              : undefined
                          }
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
                                    {statusLabel(request.status)}
                                  </span>
                                </div>

                                <div className="mt-2 text-sm text-[#4a6678]">
                                  {t("requestsPage.passenger")}{" "}
                                  <span className="font-semibold text-[#173651]">
                                    {request.passenger.name}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-[#f4b400]">
                                  {renderStars(rating)}
                                  <span className="ml-2 text-[#4a6678]">
                                    {t("common.starsOutOf5", { rating })}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  {t("requestsPage.departure")}{" "}
                                  {formatDateTimeShort(request.trip.departureTime, locale)}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  {t("requestsPage.tripType")} {tripTypeLabel}
                                  {weekdaysLabel ? ` • ${weekdaysLabel}` : ""}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  {t("requestsPage.seatsRequested")} {request.seatsRequested}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  {t("requestsPage.seatsAvailable")}{" "}
                                  {request.trip.availableSeats} / {request.trip.seatsTotal}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  {t("requestsPage.passengerPhone")}{" "}
                                  {request.passenger.phoneNumber || t("common.notSpecified")}
                                </div>
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 lg:w-[260px]">
                              <a
                                href={`/trips/${request.trip.id}`}
                                className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm backdrop-blur-sm"
                              >
                                {t("requestsPage.openTrip")}
                              </a>

                              {request.trip.status !== "cancelled" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTrip(request.trip.id)}
                                  disabled={deletingTripId === request.trip.id}
                                  className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-[#c62828] shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {deletingTripId === request.trip.id
                                    ? t("requestsPage.deleting")
                                    : t("requestsPage.deleteTrip")}
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
                                    {busyId === request.id
                                      ? t("requestsPage.processing")
                                      : t("requestsPage.accept")}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleIncomingAction(request.id, "reject")}
                                    disabled={busyId === request.id}
                                    className="flex h-12 items-center justify-center rounded-full bg-[#163c59] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {busyId === request.id
                                      ? t("requestsPage.processing")
                                      : t("requestsPage.reject")}
                                  </button>
                                </>
                              )}

                              {request.status === "accepted" && (
                                <div className="rounded-[20px] border border-[#ccecbf] bg-[#f4fff0] px-4 py-3 text-sm font-semibold text-[#24613a] shadow-sm">
                                  {t("requestsPage.incomingAcceptedNote")}
                                </div>
                              )}

                              {request.status === "rejected" && (
                                <div className="rounded-[20px] border border-[#f4d4d4] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f2f2f] shadow-sm">
                                  {t("requestsPage.incomingRejectedNote")}
                                </div>
                              )}

                              {request.status === "cancelled_by_passenger" && (
                                <div className="rounded-[20px] border border-[#d9e2ea] bg-[#f7fbfd] px-4 py-3 text-sm text-[#5d7485] shadow-sm">
                                  {t("requestsPage.incomingCancelledByPassenger")}
                                </div>
                              )}

                              {request.status === "cancelled_by_driver" && (
                                <div className="rounded-[20px] border border-[#fbe1bf] bg-[#fff6ea] px-4 py-3 text-sm text-[#9b5b12] shadow-sm">
                                  {t("requestsPage.incomingCancelledByDriver")}
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
                        request.trip.tripType === "regular"
                          ? t("common.tripTypeRegular")
                          : t("common.tripTypeOneTime");
                      const weekdaysLabel = formatWeekdays(request.trip.weekdays, t);
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
                                      {t("requestsPage.outgoingAcceptedBanner")}
                                    </div>
                                    <h3 className="mt-2 text-2xl font-extrabold text-[#1f5d34]">
                                      {t("requestsPage.outgoingContactDriver")}
                                    </h3>
                                    <p className="mt-2 text-sm text-[#467257]">
                                      {t("requestsPage.outgoingContactLead")}
                                    </p>
                                  </div>

                                  <div className="rounded-[22px] bg-white/90 px-5 py-4 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#658675]">
                                      {t("requestsPage.driverPhone")}
                                    </div>
                                    <div className="mt-2 text-2xl font-extrabold text-[#173651]">
                                      {request.driver.phoneNumber || t("common.notSpecified")}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                  <div className="rounded-[20px] bg-white/80 p-4 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7f70]">
                                      {t("requestsPage.driver")}
                                    </div>
                                    <div className="mt-2 text-lg font-bold text-[#173651]">
                                      {request.driver.name}
                                    </div>
                                  </div>

                                  <div className="rounded-[20px] bg-white/80 p-4 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7f70]">
                                      {t("requestsPage.car")}
                                    </div>
                                    <div className="mt-2 text-lg font-bold text-[#173651]">
                                      {carInfo || t("common.notSpecified")}
                                    </div>
                                  </div>

                                  <div className="rounded-[20px] bg-white/80 p-4 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7f70]">
                                      {t("requestsPage.plate")}
                                    </div>
                                    <div className="mt-2 text-lg font-bold text-[#173651]">
                                      {request.driver.carPlateNumber || t("common.notSpecified")}
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
                                      {statusLabel(request.status)}
                                    </span>
                                  </div>

                                  <div className="mt-2 text-sm text-[#4a6678]">
                                    {t("requestsPage.driver")}{" "}
                                    <span className="font-semibold text-[#173651]">
                                      {request.driver.name}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-sm text-[#f4b400]">
                                    {renderStars(rating)}
                                    <span className="ml-2 text-[#4a6678]">
                                      {t("common.starsOutOf5", { rating })}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-sm text-[#4a6678]">
                                    {t("requestsPage.departure")}{" "}
                                    {formatDateTimeShort(request.trip.departureTime, locale)}
                                  </div>
                                  <div className="mt-1 text-sm text-[#4a6678]">
                                    {t("requestsPage.tripType")} {tripTypeLabel}
                                    {weekdaysLabel ? ` • ${weekdaysLabel}` : ""}
                                  </div>
                                  <div className="mt-1 text-sm text-[#4a6678]">
                                    {t("requestsPage.seatsInRequest")} {request.seatsRequested}
                                  </div>
                                  <div className="mt-1 text-sm text-[#4a6678]">
                                    {t("requestsPage.pricePerSeat")}{" "}
                                    {formatPrice(request.trip.price, request.trip.currency)}
                                  </div>
                                  <div className="mt-1 text-sm text-[#4a6678]">
                                    {t("requestsPage.car")}: {carInfo || t("common.notSpecified")}
                                  </div>
                                  <div className="mt-1 text-sm text-[#4a6678]">
                                    {t("requestsPage.plate")}:{" "}
                                    {request.driver.carPlateNumber || t("common.notSpecified")}
                                  </div>

                                  {request.status === "accepted" && request.driver.phoneNumber && (
                                    <div className="mt-3 inline-flex rounded-full bg-[#e6f7dd] px-4 py-2 text-sm font-bold text-[#24613a]">
                                      {t("requestsPage.phoneContact")} {request.driver.phoneNumber}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex w-full flex-col gap-3 lg:w-[260px]">
                                <a
                                  href={`/trips/${request.trip.id}`}
                                  className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm backdrop-blur-sm"
                                >
                                  {t("requestsPage.openTrip")}
                                </a>

                                {(request.status === "pending" || request.status === "accepted") && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelOutgoing(request)}
                                    disabled={busyId === request.id}
                                    className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-[#c62828] shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {busyId === request.id
                                      ? t("requestsPage.cancel")
                                      : request.status === "accepted"
                                      ? t("requestsPage.cancelParticipation")
                                      : t("requestsPage.cancelRequest")}
                                  </button>
                                )}

                                {request.status === "rejected" && (
                                  <div className="rounded-[20px] border border-[#f4d4d4] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f2f2f] shadow-sm">
                                    {t("requestsPage.driverRejected")}
                                  </div>
                                )}

                                {request.status === "cancelled_by_passenger" && (
                                  <div className="rounded-[20px] border border-[#d9e2ea] bg-[#f7fbfd] px-4 py-3 text-sm text-[#5d7485] shadow-sm">
                                    {t("requestsPage.youCancelledRequest")}
                                  </div>
                                )}

                                {request.status === "cancelled_by_driver" && (
                                  <div className="rounded-[20px] border border-[#fbe1bf] bg-[#fff6ea] px-4 py-3 text-sm text-[#9b5b12] shadow-sm">
                                    {t("requestsPage.tripRemovedByDriver")}
                                  </div>
                                )}

                                {request.status === "accepted" && (
                                  <div className="rounded-[20px] border border-[#ccecbf] bg-[#f4fff0] px-4 py-3 text-sm font-semibold text-[#24613a] shadow-sm">
                                    {t("requestsPage.tripConfirmedContact")}
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

        <RideMatchModal
          open={matchOpen}
          payload={matchPayload}
          onClose={() => setMatchOpen(false)}
        />

        <div className="gomate-mobile-tab-root md:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-5 items-end px-3 pb-3 pt-2 text-center text-[11px] text-[#4d697c]">
            <a href="/" className="flex flex-col items-center gap-1">
              <span className="text-[22px] leading-none">⌂</span>
              <span>{t("requestsPage.mobileHome")}</span>
            </a>

            <a href="/trips" className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">🧳</span>
              <span>{t("requestsPage.mobileTrips")}</span>
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
              <span>{t("requestsPage.mobileRequests")}</span>
            </a>

            <a
              href="/chats"
              className="flex flex-col items-center gap-1 font-semibold text-[#18a04f]"
            >
              <span className="text-[18px] leading-none">💬</span>
              <span>{t("requestsPage.mobileChats")}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}