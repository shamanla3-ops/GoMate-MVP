import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { useTranslation } from "../i18n";
import { LocationPicker } from "../components/LocationPicker";
import { isCompleteMapPoint, type MapPointValue } from "../lib/mapTypes";

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

export default function CreateTrip() {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();

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
  const [isSuccess, setIsSuccess] = useState(false);

  function toggleWeekday(value: string) {
    setWeekdays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);

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

    if (seatsTotal < 1) {
      setMessage(t("createTrip.validation.seats"));
      return;
    }

    if (tripType === "regular" && weekdays.length === 0) {
      setMessage(t("createTrip.validation.weekdays"));
      return;
    }

    setLoading(true);

    try {
      const priceCents = Math.round(parsedPrice * 100);

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
          seatsTotal,
          price: priceCents,
          currency,
          tripType,
          weekdays: tripType === "regular" ? weekdays : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || t("createTrip.fail"));
        return;
      }

      setIsSuccess(true);
      setMessage(t("createTrip.success"));

      setOrigin({ label: "", lat: null, lng: null });
      setDestination({ label: "", lat: null, lng: null });
      setDepartureTime("");
      setSeatsTotal(1);
      setPrice("");
      setCurrency("EUR");
      setTripType("one-time");
      setWeekdays([]);

      setTimeout(() => {
        navigate("/trips");
      }, 1200);
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
          <div className="mb-6 flex items-center justify-between">
            <a href="/" className="flex items-center">
              <img
                src="/gomate-logo.png"
                alt="GoMate"
                className="h-12 w-auto sm:h-14"
              />
            </a>

            <div className="hidden items-center gap-3 md:flex">
              <a
                href="/"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("createTrip.navHome")}
              </a>
              <a
                href="/trips"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("createTrip.navTrips")}
              </a>
              <a
                href="/driver-requests"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
              >
                {t("createTrip.navRequests")}
              </a>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/60 bg-white/35 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
            <h1 className="text-3xl font-extrabold text-[#173651] sm:text-4xl">
              {t("createTrip.title")}
            </h1>
            <p className="mt-2 text-[#4a6678]">{t("createTrip.subtitle")}</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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

                <Field
                  label={t("createTrip.seats")}
                  type="number"
                  value={String(seatsTotal)}
                  onChange={(value) => setSeatsTotal(Number(value) || 1)}
                  placeholder="1"
                />

                <Field
                  label={t("createTrip.price")}
                  type="number"
                  value={price}
                  onChange={setPrice}
                  placeholder="10.00"
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#28475d]">
                    {t("createTrip.currency")}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value as "EUR" | "USD" | "PLN")
                    }
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[#193549] shadow-sm outline-none"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="PLN">PLN</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-[#28475d]">
                    {t("createTrip.tripType")}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setTripType("one-time")}
                      className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm ${
                        tripType === "one-time"
                          ? "bg-[#163c59] text-white"
                          : "bg-white/85 text-[#28475d]"
                      }`}
                    >
                      {t("createTrip.tripTypeOneTime")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTripType("regular")}
                      className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm ${
                        tripType === "regular"
                          ? "bg-[#163c59] text-white"
                          : "bg-white/85 text-[#28475d]"
                      }`}
                    >
                      {t("createTrip.tripTypeRegular")}
                    </button>
                  </div>
                </div>

                {tripType === "regular" && (
                  <div className="md:col-span-2">
                    <label className="mb-3 block text-sm font-semibold text-[#28475d]">
                      {t("createTrip.weekdays")}
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {WEEKDAY_VALUES.map((day) => {
                        const active = weekdays.includes(day);

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWeekday(day)}
                            className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm ${
                              active
                                ? "bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] text-white"
                                : "bg-white/85 text-[#28475d]"
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

              {message && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    isSuccess
                      ? "bg-[#e8f7e8] text-[#17663a]"
                      : "bg-[#fff1f0] text-[#b42318]"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-14 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-8 text-lg font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] transition hover:scale-[1.01] disabled:opacity-70"
                >
                  {loading ? t("createTrip.submitting") : t("createTrip.submit")}
                </button>

                <a
                  href="/trips"
                  className="flex h-14 items-center justify-center rounded-full border border-white/90 bg-white/88 px-8 text-lg font-semibold text-[#29485d] shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:scale-[1.01]"
                >
                  {t("createTrip.backToTrips")}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
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
      <label className="mb-2 block text-sm font-semibold text-[#28475d]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[#193549] shadow-sm outline-none placeholder:text-[#7a94a5]"
      />
    </div>
  );
}
