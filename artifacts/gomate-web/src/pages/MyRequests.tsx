import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";
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
import {
  consumeMatchCelebrationOnce,
  consumePendingToAcceptedOutgoing,
} from "../lib/rideEventFeedback";

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
  const { t, locale } = useTranslation();
  const { playRequestApproved, playRideMatch } = useSound();
  const [requests, setRequests] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchPayload, setMatchPayload] = useState<RideMatchModalPayload | null>(null);

  const loadRequests = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = localStorage.getItem("token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      if (!options?.silent) {
        setLoading(true);
        setMessage("");
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/trip-requests/outgoing`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (!options?.silent) {
            setMessage(messageFromApiError(data, t, "myRequestsPage.loadError"));
          }
          setRequests([]);
          return;
        }

        const list = Array.isArray(data.requests) ? (data.requests as OutgoingRequest[]) : [];
        setRequests(list);

        const hits = consumePendingToAcceptedOutgoing(
          list.map((r) => ({ id: r.id, status: r.status }))
        );
        for (const id of hits) {
          if (!consumeMatchCelebrationOnce(id)) continue;
          const req = list.find((r) => r.id === id);
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
      } catch {
        if (!options?.silent) {
          setMessage(t("myRequestsPage.serverError"));
        }
        setRequests([]);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [t, playRequestApproved, playRideMatch]
  );

  useEffect(() => {
    void loadRequests();
    const poll = window.setInterval(() => {
      void loadRequests({ silent: true });
    }, 20_000);
    return () => window.clearInterval(poll);
  }, [loadRequests]);

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
        setMessage(messageFromApiError(data, t, "myRequestsPage.cancelError"));
        return;
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === requestId ? { ...item, status: "cancelled" } : item
        )
      );
      setMessage(messageFromApiSuccess(data, t, "myRequestsPage.cancelled"));
    } catch {
      setMessage(t("myRequestsPage.serverError"));
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
          <AppPageHeader>
            <div className="hidden md:flex items-center gap-3">
              <a
                href="/trips"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("myRequestsPage.navTrips")}
              </a>
              <a
                href="/driver-requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("myRequestsPage.navIncoming")}
              </a>
              <a
                href="/my-requests"
                className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                {t("myRequestsPage.navMyRequests")}
                {pendingCount > 0 ? ` (${pendingCount})` : ""}
              </a>
            </div>
          </AppPageHeader>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
                  {t("myRequestsPage.title")}
                </h1>
                <p className="mt-2 text-[#4a6678]">{t("myRequestsPage.subtitle")}</p>
              </div>

              <a
                href="/trips"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)]"
              >
                {t("myRequestsPage.findMore")}
              </a>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">
                  {t("myRequestsPage.statTotal")}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">{requests.length}</div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">
                  {t("myRequestsPage.statPending")}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">{pendingCount}</div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#5d7485]">
                  {t("myRequestsPage.statAccepted")}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-[#173651]">
                  {requests.filter((request) => request.status === "accepted").length}
                </div>
              </div>
            </div>

            <div className="mt-6">
              {loading && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  {t("myRequestsPage.loading")}
                </div>
              )}

              {!loading && message && (
                <div className="mb-4 rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#28475d] shadow-sm">
                  {message}
                </div>
              )}

              {!loading && requests.length === 0 && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  {t("myRequestsPage.empty")}
                </div>
              )}

              {!loading && requests.length > 0 && (
                <div className="grid gap-5">
                  {requests.map((request) => {
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
                                    {t("tripDetails.section.driver")}
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
                                    {t("tripDetails.plateNumber")}
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
                                    {t(`requests.status.${request.status}`)}
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
                                  {t("requestsPage.seatsAvailable")}{" "}
                                  {request.trip.availableSeats} {t("common.of")}{" "}
                                  {request.trip.seatsTotal}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  {t("requestsPage.car")} {carInfo || t("common.notSpecified")}
                                </div>
                                <div className="mt-1 text-sm text-[#4a6678]">
                                  {t("requestsPage.plate")}{" "}
                                  {request.driver.carPlateNumber || t("common.notSpecified")}
                                </div>

                                {request.status === "accepted" && request.driver.phoneNumber && (
                                  <div className="mt-3 inline-flex rounded-full bg-[#e6f7dd] px-4 py-2 text-sm font-bold text-[#24613a]">
                                    {t("requestsPage.phoneContact")} {request.driver.phoneNumber}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 lg:w-[240px]">
                              <a
                                href={`/trips/${request.trip.id}`}
                                className="flex h-12 items-center justify-center rounded-full border border-white/90 bg-white/88 px-5 text-sm font-semibold text-[#29485d] shadow-sm backdrop-blur-sm"
                              >
                                {t("myRequestsPage.openTrip")}
                              </a>

                              {request.status === "pending" && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(request.id)}
                                  disabled={busyId === request.id}
                                  className="flex h-12 items-center justify-center rounded-full bg-[#163c59] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {busyId === request.id
                                    ? t("requestsPage.cancel")
                                    : t("myRequestsPage.cancelRequest")}
                                </button>
                              )}

                              {request.status === "rejected" && (
                                <div className="rounded-[20px] border border-[#f4d4d4] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f2f2f] shadow-sm">
                                  {t("myRequestsPage.driverRejected")}
                                </div>
                              )}

                              {request.status === "cancelled" && (
                                <div className="rounded-[20px] border border-[#d9e2ea] bg-[#f7fbfd] px-4 py-3 text-sm text-[#5d7485] shadow-sm">
                                  {t("myRequestsPage.youCancelled")}
                                </div>
                              )}

                              {request.status === "accepted" && (
                                <div className="rounded-[20px] border border-[#ccecbf] bg-[#f4fff0] px-4 py-3 text-sm font-semibold text-[#24613a] shadow-sm">
                                  {t("myRequestsPage.tripConfirmed")}
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
              <span>{t("myRequestsPage.mobileHome")}</span>
            </a>

            <a href="/trips" className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">🧳</span>
              <span>{t("myRequestsPage.mobileTrips")}</span>
            </a>

            <a href="/driver-requests" className="-mt-6 flex flex-col items-center gap-1">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-[22px] text-white shadow-[0_10px_20px_rgba(31,145,140,0.35)]">
                📩
              </span>
            </a>

            <a href="/my-requests" className="flex flex-col items-center gap-1 font-semibold text-[#18a04f]">
              <span className="text-[18px] leading-none">✅</span>
              <span>{t("myRequestsPage.mobileMine")}</span>
            </a>

            <a href="/profile" className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">👤</span>
              <span>{t("myRequestsPage.mobileProfile")}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
