import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { LocationPicker } from "../components/LocationPicker";
import { SeatsPicker } from "../components/SeatsPicker";
import { useSound } from "../context/SoundContext";
import { TripCreatedSuccessModal } from "../components/successModals/TripCreatedSuccessModal";
import { isCompleteMapPoint, type MapPointValue } from "../lib/mapTypes";
import { messageFromApiError } from "../lib/errorMessages";
import { fetchDrivingDurationMinutes } from "../lib/osrmClient";

const WEEKDAY_VALUES = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

function weekdayLabel(value: (typeof WEEKDAY_VALUES)[number]) {
  const keys: Record<(typeof WEEKDAY_VALUES)[number], string> = {
    mon: "weekday.mon",
    tue: "weekday.tue",
    wed: "weekday.wed",
    thu: "weekday.thu",
    fri: "weekday.fri",
    sat: "weekday.sat",
    sun: "weekday.sun",
  };
  return keys[value];
}

function clampSeatsTotal(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(9, Math.max(1, Math.round(n)));
}

export default function CreateTrip() {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const { playClick } = useSound();

  const [origin, setOrigin] = useState<MapPointValue>({
    label: "",
    lat: null,
    lng: null,
  });
  const [destination, setDestination] = useState<MapPointValue>({
    label: "",
    lat: null,
    lng: null,
  });
  const [departureTime, setDepartureTime] = useState("");
  const [seatsTotal, setSeatsTotal] = useState(1);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "PLN">("EUR");
  const [tripType, setTripType] = useState<"one-time" | "regular">("one-time");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tripCreatedModalOpen, setTripCreatedModalOpen] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  function toggleWeekday(value: string) {
    setWeekdays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  const canSubmit = useMemo(() => {
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) return false;
    if (!isCompleteMapPoint(origin) || !isCompleteMapPoint(destination)) {
      return false;
    }
    if (!departureTime.trim()) return false;
    if (tripType === "regular" && weekdays.length === 0) return false;
    return true;
  }, [price, origin, destination, departureTime, tripType, weekdays]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage(t("createTrip.validation.login"));
      return;
    }

    const parsedPrice = parseFloat(price);

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setMessage(t("createTrip.validation.price"));
      return;
    }

    if (!isCompleteMapPoint(origin) || !isCompleteMapPoint(destination)) {
      setMessage(t("createTrip.validation.coordinates"));
      return;
    }

    if (!departureTime) {
      setMessage(t("createTrip.validation.departure"));
      return;
    }

    const seatsToSend = clampSeatsTotal(seatsTotal);

    if (tripType === "regular" && weekdays.length === 0) {
      setMessage(t("createTrip.validation.weekdays"));
      return;
    }

    setLoading(true);

    try {
      const priceCents = Math.round(parsedPrice * 100);

      let estimatedDurationMinutes: number | undefined;
      const ac = new AbortController();
      const timer = window.setTimeout(() => ac.abort(), 12_000);
      try {
        estimatedDurationMinutes = await fetchDrivingDurationMinutes(
          origin.lat as number,
          origin.lng as number,
          destination.lat as number,
          destination.lng as number,
          ac.signal
        );
      } catch {
        /* server computes duration */
      } finally {
        window.clearTimeout(timer);
      }

      const response = await fetch(`${API_BASE_URL}/api/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origin: origin.label.trim(),
          destination: destination.label.trim(),
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
          departureTime,
          seatsTotal: seatsToSend,
          price: priceCents,
          currency,
          tripType,
          weekdays: tripType === "regular" ? weekdays : [],
          ...(estimatedDurationMinutes !== undefined
            ? { estimatedDurationMinutes }
            : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(messageFromApiError(data, t, "createTrip.fail"));
        return;
      }

      setMessage("");
      const newId =
        typeof data?.trip?.id === "string" ? (data.trip.id as string) : null;
      setCreatedTripId(newId);
      setTripCreatedModalOpen(true);

      setOrigin({ label: "", lat: null, lng: null });
      setDestination({ label: "", lat: null, lng: null });
      setDepartureTime("");
      setSeatsTotal(1);
      setPrice("");
      setCurrency("EUR");
      setTripType("one-time");
      setWeekdays([]);
    } catch {
      setMessage(t("createTrip.connectError"));
    } finally {
      setLoading(false);
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

        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-10">
          <AppPageHeader>
            <div className="hidden items-center gap-2 md:flex md:gap-3">
              <a href="/" className="gomate-nav-pill">
                {t("createTrip.navHome")}
              </a>
              <a href="/trips" className="gomate-nav-pill">
                {t("createTrip.navTrips")}
              </a>
              <a href="/driver-requests" className="gomate-nav-pill">
                {t("createTrip.navRequests")}
              </a>
            </div>
          </AppPageHeader>

          <div className="gomate-glass-panel sm:p-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#173651] sm:text-4xl">
              {t("createTrip.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#4a6678]">
              {t("createTrip.subtitle")}
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-7">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <LocationPicker
                    id="create-origin"
                    heading={t("location.fieldOrigin")}
                    value={origin}
                    onChange={setOrigin}
                    locale={locale}
                    t={t}
                  />
                </div>

                <div className="md:col-span-2">
                  <LocationPicker
                    id="create-destination"
                    heading={t("location.fieldDestination")}
                    value={destination}
                    onChange={setDestination}
                    locale={locale}
                    t={t}
                  />
                </div>

                <Field
                  label={t("createTrip.departure")}
                  type="datetime-local"
                  value={departureTime}
                  onChange={setDepartureTime}
                  placeholder=""
                />

                <SeatsPicker
                  label={t("createTrip.seats")}
                  value={seatsTotal}
                  onChange={setSeatsTotal}
                  t={t}
                />

                <Field
                  label={t("createTrip.price")}
                  type="number"
                  value={price}
                  onChange={setPrice}
                  placeholder="10.00"
                />

                <div>
                  <label className="gomate-field-label">{t("createTrip.currency")}</label>
                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value as "EUR" | "USD" | "PLN")
                    }
                    className="gomate-field-input"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="PLN">PLN</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="gomate-field-label">{t("createTrip.tripType")}</label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setTripType("one-time")}
                      className={`rounded-full px-5 py-3 text-sm font-bold shadow-[0_8px_22px_rgba(23,54,81,0.08)] ring-1 ring-white/90 transition ${
                        tripType === "one-time"
                          ? "bg-[#163c59] text-white ring-[#1f4d73]/50"
                          : "bg-white/90 text-[#28475d]"
                      }`}
                    >
                      {t("createTrip.tripTypeOneTime")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTripType("regular")}
                      className={`rounded-full px-5 py-3 text-sm font-bold shadow-[0_8px_22px_rgba(23,54,81,0.08)] ring-1 ring-white/90 transition ${
                        tripType === "regular"
                          ? "bg-[#163c59] text-white ring-[#1f4d73]/50"
                          : "bg-white/90 text-[#28475d]"
                      }`}
                    >
                      {t("createTrip.tripTypeRegular")}
                    </button>
                  </div>
                </div>

                {tripType === "regular" && (
                  <div className="md:col-span-2">
                    <label className="gomate-field-label mb-3">{t("createTrip.weekdays")}</label>
                    <div className="flex flex-wrap gap-3">
                      {WEEKDAY_VALUES.map((day) => {
                        const active = weekdays.includes(day);

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWeekday(day)}
                            className={`rounded-full px-5 py-3 text-sm font-bold shadow-[0_8px_20px_rgba(23,54,81,0.07)] ring-1 ring-white/90 transition ${
                              active
                                ? "bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] text-white ring-transparent"
                                : "bg-white/90 text-[#28475d]"
                            }`}
                          >
                            {t(weekdayLabel(day))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {message ? (
                <div className="gomate-alert-error">{message}</div>
              ) : null}

              <div className="mt-2 flex flex-col gap-4 border-t border-white/45 pt-8 sm:pt-10">
                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  onPointerDown={(e) => {
                    if (e.button === 0 && !loading && canSubmit) playClick();
                  }}
                  className="gomate-btn-gradient flex min-h-[3.75rem] w-full items-center justify-center rounded-full px-8 py-4 text-lg font-extrabold tracking-tight text-white shadow-[0_16px_42px_rgba(39,149,119,0.42)] ring-2 ring-white/35 transition-all duration-200 hover:brightness-[1.04] hover:shadow-[0_20px_48px_rgba(39,149,119,0.48)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:ring-white/15 sm:min-h-[4rem] sm:text-xl"
                >
                  {loading ? t("createTrip.submitting") : t("createTrip.submit")}
                </button>

                <a
                  href="/trips"
                  className="flex min-h-[3rem] w-full items-center justify-center rounded-full border border-white/80 bg-white/75 px-6 text-base font-semibold text-[#4a6678] shadow-[0_8px_22px_rgba(23,54,81,0.06)] ring-1 ring-white/90 transition hover:border-white hover:bg-white hover:text-[#173651]"
                >
                  {t("createTrip.backToTrips")}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>

      <TripCreatedSuccessModal
        open={tripCreatedModalOpen}
        onClose={() => {
          setTripCreatedModalOpen(false);
          setCreatedTripId(null);
        }}
        tripId={createdTripId}
        onViewTrips={() => navigate("/trips")}
        onViewTrip={(tripId) => navigate(`/trips/${tripId}`)}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="gomate-field-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="gomate-field-input"
      />
    </div>
  );
}
