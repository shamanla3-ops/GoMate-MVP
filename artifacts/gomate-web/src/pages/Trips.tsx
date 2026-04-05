import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { formatDateTimeShort } from "../lib/intlLocale";
import { messageFromApiError } from "../lib/errorMessages";
import { messageFromApiSuccess } from "../lib/successMessages";
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "../lib/motionVariants";

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

type Trip = {
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

type IncomingRequest = {
  id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
};

type OutgoingRequest = {
  id: string;
  tripId: string;
  seatsRequested: number;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "cancelled"
    | "cancelled_by_driver"
    | "cancelled_by_passenger";
  createdAt: string;
};

type ChatSummary = {
  id: string;
  unreadCount: number;
};

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
  return sorted.map((d) => t(`weekday.${d}`)).join(", ");
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

function getActiveOutgoingRequest(
  requests: OutgoingRequest[],
  tripId: string
): OutgoingRequest | null {
  const active = requests.find(
    (request) =>
      request.tripId === tripId &&
      (request.status === "pending" || request.status === "accepted")
  );

  return active ?? null;
}

export default function Trips() {
  const { t, locale } = useTranslation();
  const { reviewTasksPending } = useNotificationCounts();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUserLike | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [pendingIncomingCount, setPendingIncomingCount] = useState(0);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  async function loadTrips() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips`);
      const data = await response.json();

      if (!response.ok) {
        setMessage(messageFromApiError(data, t, "tripsPage.loadError"));
        setTrips([]);
        return;
      }

      setTrips(data.trips ?? []);
      setMessage("");
    } catch {
      setMessage(t("tripsPage.loadError"));
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentUser() {
    const user = (await getCurrentUser()) as CurrentUserLike | null;
    setCurrentUser(user);
  }

  async function loadIncomingCount() {
    const token = localStorage.getItem("token");

    if (!token) {
      setPendingIncomingCount(0);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/trip-requests/incoming`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setPendingIncomingCount(0);
        return;
      }

      const data = await response.json();
      const requests = (data.requests ?? []) as IncomingRequest[];

      setPendingIncomingCount(
        requests.filter((request) => request.status === "pending").length
      );
    } catch {
      setPendingIncomingCount(0);
    }
  }

  async function loadOutgoingRequests() {
    const token = localStorage.getItem("token");

    if (!token) {
      setOutgoingRequests([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/trip-requests/outgoing`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setOutgoingRequests([]);
        return;
      }

      const data = await response.json();
      setOutgoingRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      setOutgoingRequests([]);
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

  async function refreshTripsPageData() {
    await Promise.all([
      loadTrips(),
      loadIncomingCount(),
      loadOutgoingRequests(),
      loadChatUnreadCount(),
    ]);
  }

  async function handleSearch() {
    setLoading(true);
    setMessage("");

    try {
      const url = `${API_BASE_URL}/api/trips/search?origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        setMessage(messageFromApiError(data, t, "tripsPage.searchFailed"));
        setTrips([]);
        return;
      }

      setTrips(data.trips ?? []);
    } catch {
      setMessage(t("tripsPage.searchFailedNetwork"));
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTrip(tripId: string) {
    const token = localStorage.getItem("token");

    if (!token) {
      alert(t("tripsPage.loginRequired"));
      return;
    }

    const confirmed = window.confirm(t("tripsPage.deleteConfirmShort"));
    if (!confirmed) return;

    try {
      setDeletingTripId(tripId);

      const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(messageFromApiError(data, t, "tripsPage.deleteTripError"));
        return;
      }

      setMessage(messageFromApiSuccess(data, t, "success.TRIP_DELETED"));
      setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
      await Promise.all([
        loadIncomingCount(),
        loadOutgoingRequests(),
        loadChatUnreadCount(),
      ]);
    } catch {
      alert(t("tripsPage.connectionError"));
    } finally {
      setDeletingTripId(null);
    }
  }

  async function cancelPassengerRequest(request: OutgoingRequest) {
    const token = localStorage.getItem("token");

    if (!token) {
      alert(t("tripsPage.loginRequired"));
      return;
    }

    const isAccepted = request.status === "accepted";
    const confirmed = window.confirm(
      isAccepted ? t("tripsPage.cancelRideConfirm") : t("tripsPage.cancelRequestConfirm")
    );

    if (!confirmed) return;

    try {
      setCancellingRequestId(request.id);

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
        alert(messageFromApiError(data, t, "tripsPage.cancelRequestError"));
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

      if (data.trip && data.trip.id) {
        setTrips((prev) =>
          prev.map((trip) =>
            trip.id === data.trip.id
              ? {
                  ...trip,
                  availableSeats: data.trip.availableSeats,
                }
              : trip
          )
        );
      }
    } catch {
      alert(t("tripsPage.connectionError"));
    } finally {
      setCancellingRequestId(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadCurrentUser();
    refreshTripsPageData();

    const interval = setInterval(() => {
      refreshTripsPageData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentUserId = currentUser?.id ?? currentUser?.userId ?? "";
  const visibleTrips = useMemo(() => trips, [trips]);

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
            <div className="hidden items-center gap-3 md:flex">
              <a href="/" className="gomate-nav-pill font-medium">
                {t("tripsPage.home")}
              </a>
              <a href="/create-trip" className="gomate-nav-pill font-medium">
                {t("tripsPage.createTrip")}
              </a>
              <a href="/requests" className="gomate-nav-pill font-medium">
                {t("tripsPage.requests")}
                {pendingIncomingCount > 0 ? ` (${pendingIncomingCount})` : ""}
              </a>
              <a href="/chats" className="gomate-nav-pill-dark">
                {t("tripsPage.chats")}
                {chatUnreadCount > 0 ? ` (${chatUnreadCount})` : ""}
              </a>
              {reviewTasksPending > 0 ? (
                <span
                  className="rounded-full bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm"
                  title={t("nav.badge.reviewsPending", { count: reviewTasksPending })}
                >
                  {t("nav.badge.reviewsPending", { count: reviewTasksPending })}
                </span>
              ) : null}
            </div>
          </AppPageHeader>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
                  {t("tripsPage.title")}
                </h1>
                <p className="mt-2 text-[#4a6678]">{t("tripsPage.subtitle")}</p>
              </div>

              <a
                href="/create-trip"
                className="gomate-btn-gradient inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white"
              >
                {t("tripsPage.publishTrip")}
              </a>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <input
                className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm outline-none placeholder:text-[#7a94a5]"
                placeholder={t("tripsPage.originPlaceholder")}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
              <input
                className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm outline-none placeholder:text-[#7a94a5]"
                placeholder={t("tripsPage.destinationPlaceholder")}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="w-full rounded-2xl bg-[#163c59] px-4 py-3 font-semibold text-white shadow-sm"
                >
                  {t("tripsPage.search")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrigin("");
                    setDestination("");
                    setLoading(true);
                    refreshTripsPageData();
                  }}
                  className="w-full rounded-2xl bg-white/85 px-4 py-3 font-semibold text-[#28475d] shadow-sm"
                >
                  {t("tripsPage.reset")}
                </button>
              </div>
            </div>

            <div className="mt-6">
              {loading && (
                <div className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  <span className="gomate-spinner" aria-hidden />
                  <span>{t("tripsPage.loading")}</span>
                </div>
              )}

              {!loading && message && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#b42318] shadow-sm">
                  {message}
                </div>
              )}

              {!loading && !message && visibleTrips.length === 0 && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  {t("tripsPage.empty")}
                </div>
              )}

              <motion.div
                className="grid gap-4"
                variants={staggerContainerVariants}
                initial="hidden"
                animate="show"
              >
                {visibleTrips.map((trip) => {
                  const isOwnTrip = currentUserId !== "" && currentUserId === trip.driverId;
                  const rating = trip.driver.rating ?? 0;
                  const activeOutgoingRequest = getActiveOutgoingRequest(
                    outgoingRequests,
                    trip.id
                  );

                  return (
                    <motion.div
                      key={trip.id}
                      variants={staggerItemVariants}
                      className="gomate-lift-card rounded-[26px] border border-white/80 bg-white/78 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 gap-4">
                          {trip.driver.avatarUrl ? (
                            <img
                              src={trip.driver.avatarUrl}
                              alt={trip.driver.name}
                              className="h-16 w-16 rounded-full object-cover ring-4 ring-white/80"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-lg font-extrabold text-white ring-4 ring-white/80">
                              {getInitials(trip.driver.name) || "G"}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="text-xl font-extrabold text-[#1f3548]">
                                {trip.origin} → {trip.destination}
                              </h2>
                              <span className="rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-4 py-2 text-xs font-bold text-white shadow-sm">
                                {trip.tripType === "regular"
                                  ? t("tripsPage.tripType.regular")
                                  : t("tripsPage.tripType.oneTime")}
                              </span>

                              {activeOutgoingRequest?.status === "pending" && (
                                <span className="rounded-full bg-[#fff6d8] px-4 py-2 text-xs font-bold text-[#8b6a14] shadow-sm">
                                  {t("tripsPage.badge.requestSent")}
                                </span>
                              )}

                              {activeOutgoingRequest?.status === "accepted" && (
                                <span className="rounded-full bg-[#dff7d4] px-4 py-2 text-xs font-bold text-[#24613a] shadow-sm">
                                  {t("tripsPage.badge.seatConfirmed")}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#466175]">
                              <span className="font-semibold">{trip.driver.name}</span>
                              <span className="text-[#f4b400]">{renderStars(rating)}</span>
                              <span>{t("common.starsOutOf5", { rating })}</span>
                            </div>

                            {trip.tripType === "regular" &&
                              trip.weekdays &&
                              trip.weekdays.length > 0 && (
                                <p className="mt-2 text-sm text-[#4a6678]">
                                  {t("tripsPage.days")}{" "}
                                  {formatWeekdays(trip.weekdays, t)}
                                </p>
                              )}

                            {activeOutgoingRequest?.status === "accepted" && (
                              <p className="mt-2 text-sm font-semibold text-[#24613a]">
                                {t("tripsPage.confirmedPassenger")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <InfoCard
                            label={t("tripsPage.departure")}
                            value={formatDateTimeShort(trip.departureTime, locale)}
                          />
                          <InfoCard
                            label={t("tripsPage.seatsFree")}
                            value={`${trip.availableSeats} / ${trip.seatsTotal}`}
                          />
                          <InfoCard
                            label={t("tripsPage.price")}
                            value={formatPrice(trip.price, trip.currency)}
                          />
                          <InfoCard
                            label={t("tripsPage.co2")}
                            value={`${trip.estimatedCo2SavingKg} ${t("common.kg")}`}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <a
                          href={`/trips/${trip.id}`}
                          className="flex h-12 items-center justify-center rounded-full bg-[#163c59] px-6 text-sm font-bold text-white shadow-sm transition hover:scale-[1.01]"
                        >
                          {t("tripsPage.details")}
                        </a>

                        {isOwnTrip ? (
                          <button
                            type="button"
                            onClick={() => deleteTrip(trip.id)}
                            disabled={deletingTripId === trip.id}
                            className="flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-[#c62828] shadow-sm transition hover:scale-[1.01] disabled:opacity-70"
                          >
                            {deletingTripId === trip.id
                              ? t("tripsPage.deleting")
                              : t("tripsPage.deleteTrip")}
                          </button>
                        ) : activeOutgoingRequest ? (
                          <button
                            type="button"
                            onClick={() => cancelPassengerRequest(activeOutgoingRequest)}
                            disabled={cancellingRequestId === activeOutgoingRequest.id}
                            className="flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-[#c62828] shadow-sm transition hover:scale-[1.01] disabled:opacity-70"
                          >
                            {cancellingRequestId === activeOutgoingRequest.id
                              ? t("tripsPage.cancelling")
                              : activeOutgoingRequest.status === "accepted"
                              ? t("tripsPage.cancelParticipation")
                              : t("tripsPage.cancelRequest")}
                          </button>
                        ) : trip.availableSeats > 0 ? (
                          <a
                            href={`/trips/${trip.id}`}
                            className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-6 text-sm font-semibold text-[#29485d] shadow-sm"
                          >
                            {t("tripsPage.join")}
                          </a>
                        ) : (
                          <span className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-6 text-sm font-semibold text-[#9b1c1c] shadow-sm">
                            {t("tripsPage.noSeatsLeft")}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6f8798]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#1f3548]">{value}</p>
    </div>
  );
}
