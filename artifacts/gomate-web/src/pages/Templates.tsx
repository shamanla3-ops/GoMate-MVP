import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../lib/api";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { staggerContainerVariants, staggerItemVariants } from "../lib/motionVariants";
import { LocationPicker } from "../components/LocationPicker";
import { isCompleteMapPoint, type MapPointValue } from "../lib/mapTypes";
import { messageFromApiError } from "../lib/errorMessages";
import { messageFromApiSuccess } from "../lib/successMessages";

const WEEKDAY_VALUES = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

function weekdayKey(day: string) {
  const map: Record<string, string> = {
    mon: "weekday.mon",
    tue: "weekday.tue",
    wed: "weekday.wed",
    thu: "weekday.thu",
    fri: "weekday.fri",
    sat: "weekday.sat",
    sun: "weekday.sun",
  };
  return map[day] ?? day;
}

type Template = {
  id: string;
  userId?: string;
  name: string;
  origin: string;
  destination: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  defaultDepartureTime: string | null;
  availableSeats: number;
  price: number;
  currency: "EUR" | "USD" | "PLN";
  tripType: "one-time" | "regular";
  weekdays: string[] | null;
  createdAt: string;
};

export default function Templates() {
  const { t, locale } = useTranslation();

  const [name, setName] = useState("");
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
  const [defaultDepartureTime, setDefaultDepartureTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState(1);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "PLN">("EUR");
  const [tripType, setTripType] = useState<"one-time" | "regular">("one-time");
  const [weekdays, setWeekdays] = useState<string[]>([]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingTripId, setCreatingTripId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null
  );

  function toggleWeekday(day: string) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function formatWeekdays(days: string[] | null) {
    if (!days || days.length === 0) return t("templatesPage.notSet");

    return days.map((day) => t(weekdayKey(day))).join(", ");
  }

  function formatPrice(value: number, curr: string) {
    return `${(value / 100).toFixed(2)} ${curr}`;
  }

  function buildDepartureDateTime(timeValue: string | null) {
    if (!timeValue) return null;

    const trimmed = timeValue.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);

    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    const now = new Date();
    const departure = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0
    );

    if (departure.getTime() <= now.getTime()) {
      departure.setDate(departure.getDate() + 1);
    }

    return departure.toISOString();
  }

  async function loadTemplates() {
    const token = localStorage.getItem("token");

    if (!token) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(messageFromApiError(data, t, "templatesPage.loadError"));
        setTemplates([]);
        return;
      }

      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch {
      alert(t("templatesPage.connectError"));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert(t("templatesPage.validation.login"));
      return;
    }

    const parsedPrice = parseFloat(price);

    if (!name.trim()) {
      alert(t("templatesPage.validation.name"));
      return;
    }

    if (!isCompleteMapPoint(origin) || !isCompleteMapPoint(destination)) {
      alert(t("templatesPage.validation.coordinates"));
      return;
    }

    if (availableSeats < 1) {
      alert(t("templatesPage.validation.seats"));
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      alert(t("templatesPage.validation.price"));
      return;
    }

    if (tripType === "regular" && weekdays.length === 0) {
      alert(t("templatesPage.validation.weekdays"));
      return;
    }

    try {
      setCreating(true);

      const res = await fetch(`${API_BASE_URL}/api/templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          origin: origin.label.trim(),
          destination: destination.label.trim(),
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
          defaultDepartureTime: defaultDepartureTime.trim() || null,
          availableSeats,
          price: Math.round(parsedPrice * 100),
          currency,
          tripType,
          weekdays: tripType === "regular" ? weekdays : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(messageFromApiError(data, t, "templatesPage.loadError"));
        return;
      }

      setName("");
      setOrigin({ label: "", lat: null, lng: null });
      setDestination({ label: "", lat: null, lng: null });
      setDefaultDepartureTime("");
      setAvailableSeats(1);
      setPrice("");
      setCurrency("EUR");
      setTripType("one-time");
      setWeekdays([]);

      await loadTemplates();
      alert(messageFromApiSuccess(data, t, "templatesPage.created"));
    } catch {
      alert(t("templatesPage.connectError"));
    } finally {
      setCreating(false);
    }
  }

  async function createTripFromTemplate(template: Template) {
    const token = localStorage.getItem("token");

    if (!token) {
      alert(t("templatesPage.validation.login"));
      return;
    }

    const olat = template.originLat;
    const olng = template.originLng;
    const dlat = template.destinationLat;
    const dlng = template.destinationLng;

    if (
      olat == null ||
      olng == null ||
      dlat == null ||
      dlng == null ||
      !Number.isFinite(olat) ||
      !Number.isFinite(olng) ||
      !Number.isFinite(dlat) ||
      !Number.isFinite(dlng)
    ) {
      alert(t("templatesPage.templateNoCoords"));
      return;
    }

    const departureTime = buildDepartureDateTime(template.defaultDepartureTime);

    if (!departureTime) {
      alert(t("templatesPage.badDepartureTime"));
      return;
    }

    try {
      setCreatingTripId(template.id);

      const res = await fetch(`${API_BASE_URL}/api/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origin: template.origin,
          destination: template.destination,
          originLat: olat,
          originLng: olng,
          destinationLat: dlat,
          destinationLng: dlng,
          departureTime,
          availableSeats: template.availableSeats,
          price: template.price,
          currency: template.currency,
          tripType: template.tripType,
          weekdays:
            template.tripType === "regular" ? template.weekdays || [] : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(messageFromApiError(data, t, "templatesPage.tripError"));
        return;
      }

      alert(messageFromApiSuccess(data, t, "templatesPage.tripCreated"));
      window.location.href = "/trips";
    } catch {
      alert(t("templatesPage.connectError"));
    } finally {
      setCreatingTripId(null);
    }
  }

  async function deleteTemplate(templateId: string) {
    const token = localStorage.getItem("token");

    if (!token) {
      alert(t("templatesPage.validation.login"));
      return;
    }

    const confirmed = window.confirm(t("templatesPage.deleteConfirm"));
    if (!confirmed) return;

    try {
      setDeletingTemplateId(templateId);

      const res = await fetch(
        `${API_BASE_URL}/api/templates/${templateId}/delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(messageFromApiError(data, t, "templatesPage.deleteError"));
        return;
      }

      setTemplates((prev) => prev.filter((item) => item.id !== templateId));
      alert(messageFromApiSuccess(data, t, "templatesPage.deleted"));
    } catch {
      alert(t("templatesPage.connectError"));
    } finally {
      setDeletingTemplateId(null);
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
            <div className="hidden items-center gap-2 md:flex md:gap-3">
              <a href="/" className="gomate-nav-pill">
                {t("templatesPage.navHome")}
              </a>
              <a href="/trips" className="gomate-nav-pill">
                {t("templatesPage.navTrips")}
              </a>
            </div>
          </AppPageHeader>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section className="gomate-glass-panel">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#173651] sm:text-4xl">
                {t("templatesPage.title")}
              </h1>

              <p className="mt-3 text-[15px] leading-relaxed text-[#35556c]">
                {t("templatesPage.subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label className="gomate-field-label">{t("templatesPage.name")}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("templatesPage.namePlaceholder")}
                    className="gomate-field-input"
                  />
                </div>

                <LocationPicker
                  id="tpl-origin"
                  heading={t("location.fieldOrigin")}
                  value={origin}
                  onChange={setOrigin}
                  locale={locale}
                  t={t}
                />

                <LocationPicker
                  id="tpl-destination"
                  heading={t("location.fieldDestination")}
                  value={destination}
                  onChange={setDestination}
                  locale={locale}
                  t={t}
                />

                <div>
                  <label className="gomate-field-label">{t("templatesPage.departureTime")}</label>
                  <input
                    type="text"
                    value={defaultDepartureTime}
                    onChange={(e) => setDefaultDepartureTime(e.target.value)}
                    placeholder={t("templatesPage.departurePlaceholder")}
                    className="gomate-field-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="gomate-field-label">{t("templatesPage.seats")}</label>
                    <input
                      type="number"
                      min={1}
                      value={availableSeats}
                      onChange={(e) =>
                        setAvailableSeats(Number(e.target.value) || 1)
                      }
                      className="gomate-field-input"
                    />
                  </div>

                  <div>
                    <label className="gomate-field-label">{t("templatesPage.price")}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="5.00"
                      className="gomate-field-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="gomate-field-label">{t("templatesPage.currency")}</label>
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

                  <div>
                    <label className="gomate-field-label">{t("templatesPage.tripType")}</label>
                    <select
                      value={tripType}
                      onChange={(e) =>
                        setTripType(e.target.value as "one-time" | "regular")
                      }
                      className="gomate-field-input"
                    >
                      <option value="one-time">
                        {t("templatesPage.tripTypeOneTime")}
                      </option>
                      <option value="regular">
                        {t("templatesPage.tripTypeRegular")}
                      </option>
                    </select>
                  </div>
                </div>

                {tripType === "regular" && (
                  <div>
                    <label className="gomate-field-label mb-2">{t("templatesPage.weekdays")}</label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_VALUES.map((day) => {
                        const active = weekdays.includes(day);

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWeekday(day)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              active
                                ? "bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] text-white shadow-md"
                                : "bg-white/85 text-[#28475d] shadow-sm"
                            }`}
                          >
                            {t(weekdayKey(day))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="gomate-btn-gradient flex h-14 w-full items-center justify-center rounded-full px-8 text-lg font-bold text-white disabled:opacity-70"
                >
                  {creating ? t("templatesPage.submitting") : t("templatesPage.submit")}
                </button>
              </form>
            </section>

            <section className="gomate-glass-panel--soft">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#173651]">
                    {t("templatesPage.listTitle")}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#4a6678]">
                    {t("templatesPage.listSubtitle")}
                  </p>
                </div>

                <span className="inline-flex w-fit items-center rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-[#28475d] shadow-[0_8px_22px_rgba(23,54,81,0.08)] ring-1 ring-white/90">
                  {templates.length}
                </span>
              </div>

              {loading ? (
                <div className="gomate-alert-neutral flex items-center gap-3 py-5">
                  <span className="gomate-spinner" aria-hidden />
                  <span className="font-medium">{t("templatesPage.loading")}</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="gomate-empty-state text-[15px]">{t("templatesPage.empty")}</div>
              ) : (
                <motion.div
                  className="grid gap-4"
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {templates.map((template) => (
                    <motion.div
                      key={template.id}
                      variants={staggerItemVariants}
                      className="gomate-lift-card p-5 backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-xl font-extrabold text-[#1f3548]">
                            {template.name}
                          </h3>
                          <p className="mt-1 text-base font-medium text-[#35556c]">
                            {template.origin} → {template.destination}
                          </p>
                        </div>

                        <span className="gomate-chip-route w-fit px-4 py-2 text-sm">
                          {template.tripType === "regular"
                            ? t("templatesPage.regularBadge")
                            : t("templatesPage.oneTimeBadge")}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoCard
                          label={t("templatesPage.timeLabel")}
                          value={
                            template.defaultDepartureTime ||
                            t("templatesPage.notSet")
                          }
                        />
                        <InfoCard
                          label={t("templatesPage.seatsLabel")}
                          value={String(template.availableSeats)}
                        />
                        <InfoCard
                          label={t("templatesPage.priceLabel")}
                          value={formatPrice(template.price, template.currency)}
                        />
                        <InfoCard
                          label={t("templatesPage.daysLabel")}
                          value={
                            template.tripType === "regular"
                              ? formatWeekdays(template.weekdays)
                              : t("templatesPage.daysAsNeeded")
                          }
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => createTripFromTemplate(template)}
                          disabled={creatingTripId === template.id}
                          className="gomate-btn-gradient flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white disabled:opacity-70"
                        >
                          {creatingTripId === template.id
                            ? t("templatesPage.creatingTrip")
                            : t("templatesPage.createTrip")}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteTemplate(template.id)}
                          disabled={deletingTemplateId === template.id}
                          className="flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-[#c62828] shadow-sm transition hover:scale-[1.01] disabled:opacity-70"
                        >
                          {deletingTemplateId === template.id
                            ? t("templatesPage.deleting")
                            : t("templatesPage.delete")}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="gomate-info-tile">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f8798]">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-bold tabular-nums text-[#1f3548]">{value}</p>
    </div>
  );
}
