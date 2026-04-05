import { useEffect, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { formatDateTimeShort } from "../lib/intlLocale";
import { messageFromApiError } from "../lib/errorMessages";
import { messageFromApiSuccess } from "../lib/successMessages";

type IncomingRequest = {
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
  passenger: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    rating?: number | null;
    phoneNumber?: string | null;
    age?: number | null;
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

export default function DriverRequests() {
  const { t, locale } = useTranslation();
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
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
      const response = await fetch(`${API_BASE_URL}/api/trip-requests/incoming`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(messageFromApiError(data, t, "driverRequestsPage.loadError"));
        setRequests([]);
        return;
      }

      setRequests(data.requests ?? []);
    } catch {
      setMessage(t("driverRequestsPage.serverError"));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleAction(id: string, action: "accept" | "reject") {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setBusyId(id);

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
        alert(messageFromApiError(data, t, "driverRequestsPage.updateError"));
        return;
      }

      alert(
        messageFromApiSuccess(
          data,
          t,
          action === "accept"
            ? "requestsPage.incomingAcceptedNote"
            : "requestsPage.incomingRejectedNote"
        )
      );
      await loadRequests();
    } catch {
      alert(t("driverRequestsPage.serverError"));
    } finally {
      setBusyId(null);
    }
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

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
          <AppPageHeader>
            <div className="hidden md:flex items-center gap-3">
              <a
                href="/trips"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("driverRequestsPage.navTrips")}
              </a>
              <a
                href="/create-trip"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("driverRequestsPage.navCreate")}
              </a>
            </div>
          </AppPageHeader>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6">
            <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
              {t("driverRequestsPage.title")}
            </h1>
            <p className="mt-2 text-[#4a6678]">{t("driverRequestsPage.subtitle")}</p>

            <div className="mt-6">
              {loading && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  {t("driverRequestsPage.loading")}
                </div>
              )}

              {!loading && message && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#b42318] shadow-sm">
                  {message}
                </div>
              )}

              {!loading && !message && requests.length === 0 && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 text-[#4a6678] shadow-sm">
                  {t("driverRequestsPage.empty")}
                </div>
              )}

              <div className="grid gap-4">
                {requests.map((request) => {
                  const rating = request.passenger.rating ?? 0;

                  return (
                    <div
                      key={request.id}
                      className="rounded-[26px] border border-white/80 bg-white/78 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                        <div className="flex gap-4">
                          {request.passenger.avatarUrl ? (
                            <img
                              src={request.passenger.avatarUrl}
                              alt={request.passenger.name}
                              className="h-16 w-16 rounded-full object-cover ring-4 ring-white/80"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-lg font-extrabold text-white ring-4 ring-white/80">
                              {getInitials(request.passenger.name) || "G"}
                            </div>
                          )}

                          <div>
                            <h2 className="text-xl font-extrabold text-[#1f3548]">
                              {request.passenger.name}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#466175]">
                              <span className="text-[#f4b400]">{renderStars(rating)}</span>
                              <span>{t("common.starsOutOf5", { rating })}</span>
                              <span>
                                {t("driverRequestsPage.age")}{" "}
                                {request.passenger.age ?? t("common.notSpecified")}
                              </span>
                              <span>
                                {t("driverRequestsPage.phone")}{" "}
                                {request.passenger.phoneNumber ?? t("common.notSpecified")}
                              </span>
                            </div>

                            <p className="mt-3 text-sm text-[#35556c]">
                              {t("driverRequestsPage.wantsSeats", {
                                count: request.seatsRequested,
                              })}
                            </p>

                            <p className="mt-1 text-sm text-[#35556c]">
                              {t("driverRequestsPage.route")}{" "}
                              <strong>
                                {request.trip.origin} → {request.trip.destination}
                              </strong>
                            </p>

                            <p className="mt-1 text-sm text-[#35556c]">
                              {t("driverRequestsPage.departure")}{" "}
                              <strong>
                                {formatDateTimeShort(request.trip.departureTime, locale)}
                              </strong>
                            </p>

                            <p className="mt-1 text-sm text-[#35556c]">
                              {t("driverRequestsPage.seatsNow")}{" "}
                              <strong>{request.trip.availableSeats}</strong> {t("common.of")}{" "}
                              <strong>{request.trip.seatsTotal}</strong>
                            </p>

                            <p className="mt-1 text-sm text-[#35556c]">
                              {t("driverRequestsPage.requestStatus")}{" "}
                              <strong>{t(`requests.status.${request.status}`)}</strong>
                            </p>
                          </div>
                        </div>

                        {request.status === "pending" && (
                          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                            <button
                              onClick={() => handleAction(request.id, "accept")}
                              disabled={busyId === request.id}
                              className="flex h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-sm disabled:opacity-70"
                            >
                              {busyId === request.id
                                ? t("driverRequestsPage.busy")
                                : t("driverRequestsPage.confirm")}
                            </button>

                            <button
                              onClick={() => handleAction(request.id, "reject")}
                              disabled={busyId === request.id}
                              className="flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-[#c62828] shadow-sm disabled:opacity-70"
                            >
                              {busyId === request.id
                                ? t("driverRequestsPage.busy")
                                : t("driverRequestsPage.reject")}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
