import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import { useTranslation, type Locale } from "../i18n";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { TripRoutePreviewMap } from "../components/TripRoutePreviewMap";
import { AppPageHeader } from "../components/AppPageHeader";
import { PermanentPassengerModal } from "../components/PermanentPassengerModal";
import { useSound } from "../context/SoundContext";
import { JoinRequestSuccessModal } from "../components/successModals/JoinRequestSuccessModal";
import { formatDateTimeShort } from "../lib/intlLocale";
import { messageFromApiError } from "../lib/errorMessages";
import { messageFromApiSuccess } from "../lib/successMessages";
import {
  fetchPpTripContext,
  preferredTimeFromDeparture,
  registerPpSkip,
  localCalendarYmd,
  type PpTripContext,
} from "../lib/permanentPassengersApi";

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
  originLabel?: string;
  destinationLabel?: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
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

type OutgoingRequest = {
  id: string;
  tripId: string;
  passengerId: string;
  seatsRequested: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
};

type ReviewTarget = { userId: string; name: string };

type DriverIncomingTripRequest = {
  id: string;
  tripId: string;
  passengerId: string;
  seatsRequested: number;
  status: string;
  createdAt: string;
  passenger: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    rating?: number | null;
  };
};

type PpModalState =
  | { direction: "request" }
  | { direction: "invitation"; passengerId: string; passengerName: string };

function formatPrice(price: number, currency: "EUR" | "USD" | "PLN", locale: Locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(price / 100);
}

function formatWeekdays(
  weekdays: string[] | null | undefined,
  tr: (key: string) => string
): string {
  if (!weekdays || weekdays.length === 0) return "";

  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const sorted = [...weekdays].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );

  return sorted.map((day) => tr(`weekday.${day}`)).join(", ");
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

function getRequestBadgeClasses(status: OutgoingRequest["status"]) {
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

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const { playClick } = useSound();
  const { refresh: refreshNotificationCounts } = useNotificationCounts();

  const [trip, setTrip] = useState<TripDetailsData | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [openingChat, setOpeningChat] = useState(false);
  const [joiningTrip, setJoiningTrip] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [myRequest, setMyRequest] = useState<OutgoingRequest | null>(null);
  const [reviewTargets, setReviewTargets] = useState<ReviewTarget[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({});
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");

  const [ppContext, setPpContext] = useState<PpTripContext | null>(null);
  const [ppModal, setPpModal] = useState<PpModalState | null>(null);
  const [ppBusy, setPpBusy] = useState(false);
  const [driverTripRequests, setDriverTripRequests] = useState<DriverIncomingTripRequest[]>([]);
  const [driverTripRequestsLoading, setDriverTripRequestsLoading] = useState(false);
  const [joinRequestSuccessOpen, setJoinRequestSuccessOpen] = useState(false);

  async function loadTrip() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/trips/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setMessage(messageFromApiError(data, t, "tripDetails.loadError"));
        setTrip(null);
        return;
      }

      const loadedTrip = data.trip ?? null;
      setTrip(loadedTrip);
      setMessage("");

      if (loadedTrip) {
        setSeatsRequested((prev) => {
          const maxSeats = Math.max(1, loadedTrip.availableSeats);
          return Math.min(Math.max(1, prev), maxSeats);
        });
      }
    } catch {
      setMessage(t("tripDetails.connectError"));
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

  async function loadPpContext() {
    const token = localStorage.getItem("token");
    if (!token || !id) {
      setPpContext(null);
      return;
    }
    try {
      const ctx = await fetchPpTripContext(id);
      setPpContext(ctx);
    } catch {
      setPpContext(null);
    }
  }

  async function loadDriverTripRequests() {
    const token = localStorage.getItem("token");
    if (!token || !id) {
      setDriverTripRequests([]);
      return;
    }

    setDriverTripRequestsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trip-requests/incoming`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setDriverTripRequests([]);
        return;
      }
      const list = Array.isArray(data.requests) ? data.requests : [];
      const forTrip = (list as DriverIncomingTripRequest[]).filter((r) => r.tripId === id);
      setDriverTripRequests(forTrip);
    } catch {
      setDriverTripRequests([]);
    } finally {
      setDriverTripRequestsLoading(false);
    }
  }

  async function loadMyRequest() {
    const token = localStorage.getItem("token");

    if (!token || !id) {
      setMyRequest(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/trip-requests/outgoing`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setMyRequest(null);
        return;
      }

      const data = await response.json();
      const requests = Array.isArray(data.requests) ? (data.requests as OutgoingRequest[]) : [];
      const requestForThisTrip = requests.find((request) => request.tripId === id) ?? null;
      setMyRequest(requestForThisTrip);
    } catch {
      setMyRequest(null);
    }
  }

  async function loadReviewTargets() {
    const token = localStorage.getItem("token");
    if (!token || !id) {
      setReviewTargets([]);
      return;
    }

    setReviewLoading(true);
    setReviewMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/eligible/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json()) as { targets?: ReviewTarget[] };
      if (!res.ok) {
        setReviewTargets([]);
        return;
      }
      const targets = Array.isArray(data.targets) ? data.targets : [];
      setReviewTargets(targets);
      setReviewRating((prev) => {
        const next = { ...prev };
        for (const t of targets) {
          if (next[t.userId] === undefined) {
            next[t.userId] = 5;
          }
        }
        return next;
      });
    } catch {
      setReviewTargets([]);
    } finally {
      setReviewLoading(false);
    }
  }

  async function submitReview(targetUserId: string) {
    const token = localStorage.getItem("token");
    if (!token || !id) {
      return;
    }

    const rating = reviewRating[targetUserId] ?? 5;
    const comment = reviewComment[targetUserId] ?? "";

    setReviewSubmitting(targetUserId);
    setReviewMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripId: id,
          revieweeId: targetUserId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setReviewMessage(messageFromApiError(data, t, "tripDetails.review.error"));
        return;
      }

      setReviewMessage(
        messageFromApiSuccess(data, t, "tripDetails.review.success")
      );
      await Promise.all([loadReviewTargets(), loadTrip()]);
      void refreshNotificationCounts();
    } catch {
      setReviewMessage(t("tripDetails.review.error"));
    } finally {
      setReviewSubmitting(null);
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
        alert(messageFromApiError(data, t, "tripDetails.createChatError"));
        return;
      }

      window.location.href = `/chat/${data.chat.id}`;
    } catch {
      alert(t("tripDetails.connectionError"));
    } finally {
      setOpeningChat(false);
    }
  }

  async function handleJoinTrip() {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!trip) {
      return;
    }

    if (isOwnTrip) {
      setMessage(t("tripDetails.ownerCannotJoin"));
      return;
    }

    if (trip.status !== "scheduled") {
      setMessage(t("tripDetails.tripUnavailable"));
      return;
    }

    if (trip.availableSeats < 1) {
      setMessage(t("tripDetails.noFreeSeats"));
      return;
    }

    if (seatsRequested < 1 || seatsRequested > trip.availableSeats) {
      setMessage(t("tripDetails.invalidSeatCount"));
      return;
    }

    try {
      setJoiningTrip(true);
      setMessage("");

      const response = await fetch(`${API_BASE_URL}/api/trip-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripId: trip.id,
          seatsRequested,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(messageFromApiError(data, t, "tripDetails.joinError"));
        return;
      }

      setMessage("");
      setJoinRequestSuccessOpen(true);
      await Promise.all([loadTrip(), loadMyRequest(), loadPpContext()]);
      void refreshNotificationCounts();
    } catch {
      setMessage(t("tripDetails.connectError"));
    } finally {
      setJoiningTrip(false);
    }
  }

  async function handleCancelRequest() {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!myRequest) {
      return;
    }

    try {
      setCancellingRequest(true);
      setMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/trip-requests/${myRequest.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(messageFromApiError(data, t, "tripDetails.cancelError"));
        return;
      }

      setMessage(messageFromApiSuccess(data, t, "tripDetails.cancelSuccess"));
      await Promise.all([loadTrip(), loadMyRequest(), loadPpContext()]);
    } catch {
      setMessage(t("tripDetails.connectError"));
    } finally {
      setCancellingRequest(false);
    }
  }

  useEffect(() => {
    loadTrip();
    loadCurrentUser();
    loadChatUnreadCount();
    loadMyRequest();

    const interval = setInterval(() => {
      loadChatUnreadCount();
      loadMyRequest();
    }, 15000);

    return () => clearInterval(interval);
  }, [id, locale]);

  const currentUserId = currentUser?.id ?? currentUser?.userId ?? "";

  useEffect(() => {
    void loadPpContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUserId]);

  useEffect(() => {
    if (!id || !currentUserId || !trip || trip.driverId !== currentUserId) {
      setDriverTripRequests([]);
      return;
    }
    void loadDriverTripRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUserId, trip?.driverId]);

  useEffect(() => {
    if (!id || !trip) {
      return;
    }
    void loadReviewTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when trip or participation changes
  }, [id, trip?.departureTime, trip?.status, myRequest?.status, currentUserId]);

  const isOwnTrip = useMemo(() => {
    if (!trip || !currentUserId) return false;
    return trip.driverId === currentUserId;
  }, [trip, currentUserId]);

  const hasActiveRequest =
    myRequest?.status === "pending" || myRequest?.status === "accepted";

  const canCancelRequest =
    myRequest?.status === "pending" || myRequest?.status === "accepted";

  async function handlePpSkipToday() {
    const rel = ppContext?.activeRelationshipWithDriver;
    if (!rel?.id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setPpBusy(true);
    setMessage("");
    try {
      await registerPpSkip(rel.id, localCalendarYmd());
      setMessage(t("tripDetails.pp.skipSuccess"));
      await loadPpContext();
    } catch (e: unknown) {
      setMessage(messageFromApiError(e as { errorCode?: string }, t, "tripDetails.pp.skipError"));
    } finally {
      setPpBusy(false);
    }
  }

  const riderRequestsForOwner = useMemo(() => {
    return driverTripRequests.filter(
      (r) => r.status === "pending" || r.status === "accepted"
    );
  }, [driverTripRequests]);

  const requestStatusText = myRequest
    ? myRequest.status === "pending"
      ? t("tripDetails.requestStatus.pending")
      : myRequest.status === "accepted"
      ? t("tripDetails.requestStatus.accepted")
      : myRequest.status === "rejected"
      ? t("tripDetails.requestStatus.rejected")
      : t("tripDetails.requestStatus.cancelled")
    : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef4f8]">
        <div className="text-lg text-[#35556c]">{t("tripDetails.loading")}</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef4f8] px-4">
        <div className="rounded-[24px] border border-white/80 bg-white/80 px-6 py-5 text-[#b42318] shadow-sm">
          {message || t("tripDetails.notFound")}
        </div>
      </div>
    );
  }

  const rating = trip.driver.rating ?? 0;
  const weekdaysLabel = formatWeekdays(trip.weekdays, t);
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
          <AppPageHeader>
            <div className="hidden md:flex items-center gap-3">
              <a
                href="/trips"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("nav.trips")}
              </a>
              <a
                href="/requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("nav.requests")}
              </a>
              <a
                href="/chats"
                className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                {t("nav.chats")}
                {chatUnreadCount > 0 ? ` (${chatUnreadCount})` : ""}
              </a>
              <a
                href="/profile"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("nav.profile")}
              </a>
              <a
                href="/permanent-passengers"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("nav.permanentPassengers")}
              </a>
            </div>
          </AppPageHeader>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
                    {trip.origin} → {trip.destination}
                  </h1>

                  <span className="rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-4 py-2 text-xs font-bold text-white shadow-sm">
                    {trip.tripType === "regular"
                      ? t("tripDetails.type.regular")
                      : t("tripDetails.type.oneTime")}
                  </span>

                  {trip.status !== "scheduled" && (
                    <span className="rounded-full bg-[#fff1df] px-4 py-2 text-xs font-bold text-[#9b5b12] shadow-sm">
                      {trip.status}
                    </span>
                  )}

                  {ppContext?.activeRelationshipWithDriver && (
                    <span className="gomate-chip-success">
                      {ppContext.activeRelationshipWithDriver.skippingToday
                        ? t("tripDetails.pp.badge.skippingToday")
                        : t("tripDetails.pp.badge.regularRider")}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-[#4a6678]">
                  {t("tripDetails.summary")}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:w-[320px]">
                <a
                  href="/trips"
                  className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-6 text-sm font-semibold text-[#29485d] shadow-sm"
                >
                  {t("tripDetails.backToTrips")}
                </a>

                {currentUserId &&
                  isOwnTrip &&
                  ppContext &&
                  typeof ppContext.driverPermanentPassengerCount === "number" &&
                  ppContext.driverPermanentPassengerCount > 0 && (
                    <div className="gomate-benefit-strip">
                      {t("tripDetails.pp.driverHasRegular", {
                        count: ppContext.driverPermanentPassengerCount,
                      })}
                    </div>
                  )}

                {currentUserId && ppContext?.seatMessageHint && (
                  <div className="gomate-alert-neutral text-sm leading-relaxed">
                    {ppContext.seatMessageHint === "permanent_passenger_priority_hint"
                      ? t("tripDetails.pp.prioritySeatHint")
                      : ppContext.seatMessageHint === "permanent_passenger_skipping_hint"
                        ? t("tripDetails.pp.skippingHint")
                        : null}
                  </div>
                )}

                {currentUserId &&
                  !isOwnTrip &&
                  trip.status === "scheduled" &&
                  !ppContext?.activeRelationshipWithDriver && (
                    <button
                      type="button"
                      onClick={() => setPpModal({ direction: "request" })}
                      className="flex h-12 items-center justify-center rounded-full border border-[#cfe9c8] bg-[#f1faf4] px-6 text-sm font-bold text-[#1d5d2f] shadow-sm"
                    >
                      {t("tripDetails.pp.cta.becomeRegular")}
                    </button>
                  )}

                {currentUserId &&
                  !isOwnTrip &&
                  ppContext?.activeRelationshipWithDriver &&
                  !ppContext.activeRelationshipWithDriver.skippingToday && (
                    <button
                      type="button"
                      onClick={() => void handlePpSkipToday()}
                      disabled={ppBusy}
                      className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-6 text-sm font-bold text-[#29485d] shadow-sm disabled:opacity-60"
                    >
                      {ppBusy ? t("tripDetails.pp.skipWorking") : t("tripDetails.pp.skipToday")}
                    </button>
                  )}

                {!isOwnTrip && !hasActiveRequest && (
                  <>
                    <div className="rounded-[22px] border border-white/80 bg-white/88 p-4 shadow-sm">
                      <label
                        htmlFor="seatsRequested"
                        className="mb-2 block text-sm font-semibold text-[#35556c]"
                      >
                        {t("tripDetails.seatsRequested.label")}
                      </label>

                      <select
                        id="seatsRequested"
                        value={seatsRequested}
                        onChange={(e) => setSeatsRequested(Number(e.target.value))}
                        disabled={joiningTrip || trip.availableSeats < 1}
                        className="w-full rounded-2xl border border-[#d7e4eb] bg-white px-4 py-3 text-[#193549] outline-none"
                      >
                        {Array.from(
                          { length: Math.max(1, trip.availableSeats) },
                          (_, index) => index + 1
                        ).map((count) => (
                          <option key={count} value={count}>
                            {count}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleJoinTrip}
                      onPointerDown={(e) => {
                        if (
                          e.button === 0 &&
                          !joiningTrip &&
                          trip.availableSeats >= 1
                        ) {
                          playClick();
                        }
                      }}
                      disabled={joiningTrip || trip.availableSeats < 1}
                      className="flex h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {joiningTrip
                        ? t("tripDetails.joinSending")
                        : trip.availableSeats < 1
                        ? t("tripDetails.noSeats")
                        : t("tripDetails.joinButton")}
                    </button>
                  </>
                )}

                {!isOwnTrip && myRequest && (
                  <div className="rounded-[22px] border border-white/80 bg-white/88 p-4 shadow-sm">
                    <div
                      className={`inline-flex rounded-full px-3 py-2 text-xs font-bold ${getRequestBadgeClasses(
                        myRequest.status
                      )}`}
                    >
                      {requestStatusText}
                    </div>

                    <p className="mt-3 text-sm text-[#35556c]">
                      {t("tripDetails.requestSeatsLabel")}{" "}
                      <strong>{myRequest.seatsRequested}</strong>
                    </p>

                    {myRequest.status === "pending" && (
                      <p className="mt-2 text-sm text-[#35556c]">
                        {t("tripDetails.pendingHint")}
                      </p>
                    )}

                    {myRequest.status === "accepted" && (
                      <p className="mt-2 text-sm text-[#35556c]">
                        {t("tripDetails.acceptedHint")}
                      </p>
                    )}

                    {myRequest.status === "rejected" && (
                      <p className="mt-2 text-sm text-[#35556c]">
                        {t("tripDetails.rejectedHint")}
                      </p>
                    )}

                    {myRequest.status === "cancelled" && (
                      <p className="mt-2 text-sm text-[#35556c]">
                        {t("tripDetails.cancelledHint")}
                      </p>
                    )}

                    {canCancelRequest && (
                      <button
                        type="button"
                        onClick={handleCancelRequest}
                        disabled={cancellingRequest}
                        className="mt-4 flex h-11 w-full items-center justify-center rounded-full border border-white/90 bg-white px-5 text-sm font-bold text-[#29485d] shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {cancellingRequest
                          ? t("tripDetails.cancelling")
                          : t("tripDetails.cancelButton")}
                      </button>
                    )}
                  </div>
                )}

                {!isOwnTrip && (
                  <button
                    type="button"
                    onClick={handleChat}
                    disabled={openingChat}
                    className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-6 text-sm font-bold text-[#29485d] shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {openingChat
                      ? t("tripDetails.chatOpening")
                      : t("tripDetails.writeDriver")}
                  </button>
                )}

                {isOwnTrip && (
                  <a
                    href="/chats"
                    className="flex h-12 items-center justify-center rounded-full bg-[#163c59] px-6 text-sm font-bold text-white shadow-sm"
                  >
                    {t("tripDetails.openChats")}
                  </a>
                )}

                {isOwnTrip && (
                  <a
                    href="/permanent-passengers"
                    className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-6 text-sm font-bold text-[#29485d] shadow-sm"
                  >
                    {t("tripDetails.pp.manageRegularRides")}
                  </a>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm">
                <h2 className="text-xl font-extrabold text-[#173651]">
                  {t("tripDetails.section.tripInfo")}
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <DetailCard
                    label={t("tripDetails.departure")}
                    value={formatDateTimeShort(trip.departureTime, locale)}
                  />
                  <DetailCard
                    label={t("tripDetails.pricePerSeat")}
                    value={formatPrice(trip.price, trip.currency, locale)}
                  />
                  <DetailCard
                    label={t("tripDetails.seatsAvailable")}
                    value={`${trip.availableSeats} / ${trip.seatsTotal}`}
                  />
                  <DetailCard
                    label={t("tripDetails.co2Saving")}
                    value={`${trip.estimatedCo2SavingKg} ${t("common.kg")}`}
                  />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailCard
                    label={t("tripDetails.tripType")}
                    value={
                      trip.tripType === "regular"
                        ? t("tripDetails.type.regular")
                        : t("tripDetails.type.oneTime")
                    }
                  />
                  <DetailCard
                    label={t("tripDetails.weekdays")}
                    value={weekdaysLabel || t("tripDetails.weekdaysNotSpecified")}
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm">
                <h2 className="text-xl font-extrabold text-[#173651]">
                  {t("tripDetails.section.driver")}
                </h2>

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
                      <span className="ml-2 text-[#4a6678]">
                        {rating} {t("tripDetails.outOf5")}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[#4a6678]">
                      {t("tripDetails.age")}:{" "}
                      {trip.driver.age ?? t("tripDetails.notSpecified")}
                    </div>
                    <div className="mt-1 text-sm text-[#4a6678]">
                      {t("tripDetails.phone")}:{" "}
                      {trip.driver.phoneNumber || t("tripDetails.phoneHidden")}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <DetailCard
                    label={t("tripDetails.car")}
                    value={carInfo || t("tripDetails.notProvided")}
                  />
                  <DetailCard
                    label={t("tripDetails.plateNumber")}
                    value={trip.driver.carPlateNumber || t("tripDetails.notSpecified")}
                  />
                </div>
              </div>
            </div>

            {isOwnTrip && currentUserId && trip.status === "scheduled" && (
              <div className="mt-8 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-xl font-extrabold text-[#173651]">
                    {t("tripDetails.pp.section.riders")}
                  </h2>
                  <a
                    href="/driver-requests"
                    className="text-sm font-semibold text-[#1296e8] underline-offset-2 hover:underline"
                  >
                    {t("tripDetails.pp.riders.openRequestsPage")}
                  </a>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#4a6678]">
                  {t("tripDetails.pp.riders.hint")}
                </p>

                {driverTripRequestsLoading ? (
                  <p className="mt-4 text-sm text-[#35556c]">{t("tripDetails.pp.riders.loading")}</p>
                ) : riderRequestsForOwner.length === 0 ? (
                  <div className="gomate-empty-state mt-4 py-10">
                    <p className="text-sm font-semibold text-[#35556c]">
                      {t("tripDetails.pp.riders.empty")}
                    </p>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {riderRequestsForOwner.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-col gap-3 rounded-[22px] border border-[#e3eef3] bg-[#f7fbfd] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-extrabold text-[#173651]">
                              {r.passenger?.name ?? t("tripDetails.pp.riders.unknownPassenger")}
                            </span>
                            {r.status === "pending" ? (
                              <span className="gomate-chip-warn">
                                {t("tripDetails.pp.riders.pendingBadge")}
                              </span>
                            ) : (
                              <span className="gomate-chip-success">
                                {t("tripDetails.pp.riders.acceptedBadge")}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-[#5a7389]">
                            {t("tripDetails.pp.riders.seats", { count: r.seatsRequested })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          {r.status === "accepted" ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPpModal({
                                  direction: "invitation",
                                  passengerId: r.passengerId,
                                  passengerName: r.passenger?.name ?? "",
                                })
                              }
                              className="flex h-11 items-center justify-center rounded-full border border-[#cfe9c8] bg-[#f1faf4] px-5 text-sm font-bold text-[#1d5d2f] shadow-sm"
                            >
                              {t("tripDetails.pp.riders.inviteRegular")}
                            </button>
                          ) : (
                            <a
                              href="/driver-requests"
                              className="flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-[#29485d] shadow-sm ring-1 ring-[#d7e4eb]"
                            >
                              {t("tripDetails.pp.riders.reviewRequest")}
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {trip.originLat != null &&
              trip.originLng != null &&
              trip.destinationLat != null &&
              trip.destinationLng != null &&
              Number.isFinite(trip.originLat) &&
              Number.isFinite(trip.originLng) &&
              Number.isFinite(trip.destinationLat) &&
              Number.isFinite(trip.destinationLng) && (
                <div className="mt-8 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm">
                  <h2 className="text-xl font-extrabold text-[#173651]">
                    {t("tripDetails.mapTitle")}
                  </h2>
                  <div className="mt-4">
                    <TripRoutePreviewMap
                      originLat={trip.originLat}
                      originLng={trip.originLng}
                      destinationLat={trip.destinationLat}
                      destinationLng={trip.destinationLng}
                      originLabel={trip.originLabel ?? trip.origin}
                      destinationLabel={trip.destinationLabel ?? trip.destination}
                      t={t}
                    />
                  </div>
                </div>
              )}

            {currentUserId && trip.status === "completed" && (
              <div className="mt-8 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm">
                <h2 className="text-xl font-extrabold text-[#173651]">
                  {t("tripDetails.review.sectionTitle")}
                </h2>
                <p className="mt-2 text-sm text-[#4a6678]">
                  {t("tripDetails.review.hint")}
                </p>

                {reviewLoading ? (
                  <p className="mt-4 text-sm text-[#35556c]">
                    {t("tripDetails.review.loading")}
                  </p>
                ) : reviewTargets.length === 0 ? (
                  <p className="mt-4 text-sm text-[#35556c]">
                    {t("tripDetails.review.none")}
                  </p>
                ) : (
                  <div className="mt-4 space-y-5">
                    {reviewTargets.map((target) => (
                      <div
                        key={target.userId}
                        className="rounded-[22px] border border-[#e3eef3] bg-[#f7fbfd] p-4"
                      >
                        <div className="text-sm font-semibold text-[#173651]">
                          {target.name}
                        </div>
                        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-[#6f8798]">
                          {t("tripDetails.review.rateLabel")}
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                setReviewRating((prev) => ({
                                  ...prev,
                                  [target.userId]: n,
                                }))
                              }
                              className={`h-10 min-w-[2.5rem] rounded-full px-3 text-sm font-bold shadow-sm ${
                                (reviewRating[target.userId] ?? 5) === n
                                  ? "bg-[#163c59] text-white"
                                  : "bg-white text-[#29485d] ring-1 ring-[#d7e4eb]"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[#6f8798]">
                          {t("tripDetails.review.commentLabel")}
                        </label>
                        <textarea
                          value={reviewComment[target.userId] ?? ""}
                          onChange={(e) =>
                            setReviewComment((prev) => ({
                              ...prev,
                              [target.userId]: e.target.value,
                            }))
                          }
                          rows={3}
                          placeholder={t("tripDetails.review.placeholder")}
                          className="mt-2 w-full rounded-2xl border border-[#d7e4eb] bg-white px-4 py-3 text-sm text-[#193549] outline-none placeholder:text-[#7a94a5]"
                        />
                        <button
                          type="button"
                          onClick={() => void submitReview(target.userId)}
                          disabled={reviewSubmitting === target.userId}
                          className="mt-4 flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                        >
                          {reviewSubmitting === target.userId
                            ? t("tripDetails.review.submitting")
                            : t("tripDetails.review.submit")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {reviewMessage ? (
                  <div className="mt-4 rounded-[18px] border border-white/80 bg-white/75 px-4 py-3 text-sm text-[#28475d] shadow-sm">
                    {reviewMessage}
                  </div>
                ) : null}
              </div>
            )}

            {message && (
              <div className="mt-6 rounded-[20px] border border-white/80 bg-white/75 px-4 py-3 text-sm text-[#28475d] shadow-sm">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      <JoinRequestSuccessModal
        open={joinRequestSuccessOpen}
        onClose={() => setJoinRequestSuccessOpen(false)}
        onViewRequests={() => navigate("/my-requests")}
      />

      <PermanentPassengerModal
        open={ppModal !== null}
        onClose={() => setPpModal(null)}
        direction={ppModal?.direction ?? "request"}
        targetUserId={
          ppModal?.direction === "invitation" ? ppModal.passengerId : trip.driverId
        }
        targetDisplayName={
          ppModal?.direction === "invitation"
            ? ppModal.passengerName
            : trip.driver.name
        }
        defaultWeekdays={trip.weekdays ?? undefined}
        defaultPreferredTime={preferredTimeFromDeparture(trip.departureTime)}
        tripId={trip.id}
        templateId={null}
        originText={trip.origin}
        destinationText={trip.destination}
        onSuccess={() => {
          void loadPpContext();
          void loadDriverTripRequests();
        }}
      />
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