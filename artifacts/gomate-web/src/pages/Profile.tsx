import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import {
  normalizeCurrentUserFromApi,
  parseApiUserEnvelope,
  type CurrentUser,
} from "../lib/auth";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { ProfileAvatarCircle } from "../components/ProfileAvatarCircle";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import { messageFromApiError } from "../lib/errorMessages";
import { messageFromApiSuccess } from "../lib/successMessages";

type ProfileForm = {
  name: string;
  phoneNumber: string;
  carBrand: string;
  carModel: string;
  carColor: string;
  carPlateNumber: string;
  age: string;
  avatarUrl: string;
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

function formatNoShowReasonLabel(
  tr: (key: string) => string,
  reason: string | null | undefined
): string {
  if (!reason) return "";
  const map: Record<string, string> = {
    driver_no_show: "profilePage.reviewReason.driver_no_show",
    passenger_no_show: "profilePage.reviewReason.passenger_no_show",
    trip_cancelled: "profilePage.reviewReason.trip_cancelled",
    other: "profilePage.reviewReason.other",
  };
  const key = map[reason];
  return key ? tr(key) : reason;
}

type ReviewItem = {
  id: string;
  tripId: string;
  tripLabel: string;
  authorName: string;
  rating: number | null;
  comment: string | null;
  tripHappened?: boolean;
  noShowReason?: string | null;
  createdAt: string;
};

function ProfileHeader({
  userName,
  avatarUrl,
  onLogout,
  reviewTasksPending,
}: {
  userName: string;
  avatarUrl?: string | null;
  onLogout: () => void;
  reviewTasksPending: number;
}) {
  const { t } = useTranslation();
  return (
    <AppPageHeader>
      <nav className="hidden items-center gap-2 md:flex md:gap-3">
        <a href="/" className="gomate-nav-pill">
          {t("profilePage.navHome")}
        </a>
        <a href="/trips" className="gomate-nav-pill">
          {t("profilePage.navTrips")}
        </a>
        <a href="/templates" className="gomate-nav-pill">
          {t("profilePage.navTemplates")}
        </a>
        <a href="/permanent-passengers" className="gomate-nav-pill">
          {t("nav.permanentPassengers")}
        </a>
        <a
          href="/profile"
          className="gomate-nav-pill-dark inline-flex max-w-[12rem] items-center gap-2.5 pl-2 pr-4"
          title={userName}
        >
          <ProfileAvatarCircle name={userName} avatarUrl={avatarUrl} size="sm" />
          <span className="min-w-0 truncate font-semibold">{userName}</span>
        </a>
        {reviewTasksPending > 0 ? (
          <span
            className="gomate-badge-reviews"
            title={t("nav.badge.reviewsPending", { count: reviewTasksPending })}
          >
            {t("nav.badge.reviewsPending", { count: reviewTasksPending })}
          </span>
        ) : null}
        <button type="button" onClick={onLogout} className="gomate-nav-pill">
          {t("profilePage.logout")}
        </button>
      </nav>
    </AppPageHeader>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { reviewTasksPending } = useNotificationCounts();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phoneNumber: "",
    carBrand: "",
    carModel: "",
    carColor: "",
    carPlateNumber: "",
    age: "",
    avatarUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  async function loadProfile() {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(messageFromApiError(data, t, "profilePage.loadError"));
        return;
      }

      const rawUser = parseApiUserEnvelope(data);
      const profileUser = normalizeCurrentUserFromApi(rawUser);
      if (!profileUser) {
        setError(t("profilePage.loadError"));
        return;
      }

      setUser(profileUser);
      setForm({
        name: profileUser.name ?? "",
        phoneNumber: profileUser.phoneNumber ?? "",
        carBrand: profileUser.carBrand ?? "",
        carModel: profileUser.carModel ?? "",
        carColor: profileUser.carColor ?? "",
        carPlateNumber: profileUser.carPlateNumber ?? "",
        age: profileUser.age ? String(profileUser.age) : "",
        avatarUrl: profileUser.avatarUrl ?? "",
      });

      setReviewsLoading(true);
      try {
        const rv = await fetch(
          `${API_BASE_URL}/api/reviews?subjectId=${encodeURIComponent(profileUser.id)}`
        );
        const rvData = (await rv.json()) as { reviews?: ReviewItem[] };
        if (rv.ok && Array.isArray(rvData.reviews)) {
          setReviews(rvData.reviews);
        } else {
          setReviews([]);
        }
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    } catch {
      setError(t("profilePage.serverError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("profilePage.avatarImageOnly"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t("profilePage.avatarTooBig"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((prev) => ({ ...prev, avatarUrl: result }));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  function handleChange(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          phoneNumber: form.phoneNumber,
          carBrand: form.carBrand,
          carModel: form.carModel,
          carColor: form.carColor,
          carPlateNumber: form.carPlateNumber,
          age: form.age,
          avatarUrl: form.avatarUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(messageFromApiError(data, t, "profilePage.saveError"));
        return;
      }

      const rawSaved = parseApiUserEnvelope(data);
      const savedUser = normalizeCurrentUserFromApi(rawSaved);
      if (savedUser) {
        setUser(savedUser);
        window.dispatchEvent(
          new CustomEvent<CurrentUser>("gomate-user-updated", { detail: savedUser })
        );
      }
      setMessage(messageFromApiSuccess(data, t, "profilePage.saved"));
    } catch {
      setError(t("profilePage.serverError"));
    } finally {
      setSaving(false);
    }
  }

  const displayName = useMemo(
    () => form.name.trim() || user?.name || "GoMate User",
    [form.name, user?.name]
  );

  const displayAvatar = form.avatarUrl || user?.avatarUrl || "";
  const rating = user?.rating ?? 0;
  const co2SavedKg = user?.co2SavedKg ?? 0;
  const reviewCount = user?.reviewCount ?? reviews.length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#eef4f8] px-4 text-[#4a6678]">
        <span className="gomate-spinner" aria-hidden />
        <span className="text-base font-medium">{t("profilePage.loading")}</span>
      </div>
    );
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
          <div className="absolute bottom-[120px] left-1/2 h-[220px] w-[140%] -translate-x-1/2 rounded-[50%] border-t-[8px] border-white/55" />
          <div className="absolute bottom-[108px] left-1/2 h-[180px] w-[118%] -translate-x-1/2 rounded-[50%] border-t-2 border-[#9dc7d6]/40" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10">
          <ProfileHeader
            userName={displayName}
            avatarUrl={displayAvatar || null}
            onLogout={handleLogout}
            reviewTasksPending={reviewTasksPending}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <aside className="gomate-glass-panel lg:p-7">
              <div className="flex flex-col items-center text-center">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="h-32 w-32 rounded-full object-cover shadow-lg ring-4 ring-white/80"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-4xl font-extrabold text-white shadow-lg ring-4 ring-white/80">
                    {getInitials(displayName) || "G"}
                  </div>
                )}

                <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#173651] sm:text-3xl">
                  {displayName}
                </h1>

                <p className="mt-1.5 text-sm text-[#5d7485]">{user?.email}</p>

                <div className="mt-6 w-full rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_12px_32px_rgba(23,54,81,0.07)]">
                  <div className="text-sm font-semibold text-[#5d7485]">
                    {t("profilePage.ratingTitle")}
                  </div>
                  <div className="mt-2 text-3xl text-[#f4b400]">
                    {renderStars(rating)}
                  </div>
                  <div className="mt-2 text-sm text-[#35556c]">
                    {t("profilePage.ratingStars", { rating })}
                  </div>
                  <div className="mt-1 text-xs text-[#7a94a5]">
                    {t("profilePage.reviewsCount", { count: reviewCount })}
                  </div>
                </div>

                <div className="mt-4 w-full rounded-2xl border border-[#cfe9d8]/80 bg-[linear-gradient(165deg,#e6f6df_0%,#eef8ff_100%)] p-5 shadow-[0_12px_32px_rgba(23,54,81,0.06)]">
                  <div className="text-sm font-semibold text-[#4e6b5f]">
                    {t("profilePage.co2Title")}
                  </div>
                  <div className="mt-2 text-4xl font-extrabold text-[#173651]">
                    {co2SavedKg}
                    <span className="ml-2 text-lg font-semibold text-[#5d7485]">
                      {t("common.kg")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#486476]">
                    {t("profilePage.co2Hint")}
                  </p>
                </div>

                <div className="mt-5 w-full rounded-2xl border border-white/85 bg-white/92 p-5 text-left shadow-[0_10px_28px_rgba(23,54,81,0.06)]">
                  <div className="text-sm font-semibold text-[#5d7485]">
                    {t("profilePage.reviewsAboutYou")}
                  </div>
                  {reviewsLoading ? (
                    <p className="mt-3 text-sm text-[#5d7485]">
                      {t("profilePage.reviewsLoading")}
                    </p>
                  ) : reviews.length === 0 ? (
                    <p className="mt-3 text-sm text-[#5d7485]">
                      {t("profilePage.reviewsEmpty")}
                    </p>
                  ) : (
                    <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto text-left">
                      {reviews.map((r) => (
                        <li
                          key={r.id}
                          className="rounded-2xl border border-[#e8f0f4] bg-[#f8fcff] p-3"
                        >
                          <div className="text-xs font-semibold text-[#5d7485]">
                            {r.tripLabel}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[#173651]">
                            {r.authorName}
                          </div>
                          {r.tripHappened === false ? (
                            <p className="mt-1 text-sm font-semibold text-[#9b5b12]">
                              {t("profilePage.reviewDidNotHappen")}
                              {r.noShowReason
                                ? ` — ${formatNoShowReasonLabel(t, r.noShowReason)}`
                                : ""}
                            </p>
                          ) : (
                            <div className="text-lg text-[#f4b400]">
                              {renderStars(r.rating ?? 0)}
                            </div>
                          )}
                          {r.comment ? (
                            <p className="mt-1 text-sm text-[#35556c]">{r.comment}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </aside>

            <section className="gomate-glass-panel sm:p-8">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#173651]">
                  {t("profilePage.formTitle")}
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#4a6678]">
                  {t("profilePage.formSubtitle")}
                </p>
              </div>

              <form onSubmit={handleSave} className="mt-8 space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#28475d]">
                      {t("profilePage.avatar")}
                    </label>
                    <div className="rounded-[24px] border border-dashed border-white/90 bg-white/80 p-4 shadow-sm">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="block w-full text-sm text-[#35556c] file:mr-4 file:rounded-full file:border-0 file:bg-[#163c59] file:px-4 file:py-2 file:font-semibold file:text-white"
                      />
                      <p className="mt-3 text-sm text-[#5d7485]">
                        {t("profilePage.avatarHint")}
                      </p>
                    </div>
                  </div>

                  <Field
                    label={t("profilePage.name")}
                    value={form.name}
                    onChange={(value) => handleChange("name", value)}
                    placeholder="Yurii"
                  />

                  <Field
                    label={t("profilePage.age")}
                    type="number"
                    value={form.age}
                    onChange={(value) => handleChange("age", value)}
                    placeholder="30"
                  />

                  <Field
                    label={t("profilePage.phone")}
                    value={form.phoneNumber}
                    onChange={(value) => handleChange("phoneNumber", value)}
                    placeholder="+48 000 000 000"
                  />

                  <Field
                    label={t("profilePage.carBrand")}
                    value={form.carBrand}
                    onChange={(value) => handleChange("carBrand", value)}
                    placeholder="Skoda"
                  />

                  <Field
                    label={t("profilePage.carModel")}
                    value={form.carModel}
                    onChange={(value) => handleChange("carModel", value)}
                    placeholder="Superb"
                  />

                  <Field
                    label={t("profilePage.carColor")}
                    value={form.carColor}
                    onChange={(value) => handleChange("carColor", value)}
                    placeholder="Gray"
                  />

                  <Field
                    label={t("profilePage.plate")}
                    value={form.carPlateNumber}
                    onChange={(value) => handleChange("carPlateNumber", value)}
                    placeholder="ZS 12345"
                  />
                </div>

                <div className="rounded-2xl border border-white/85 bg-white/90 p-5 shadow-[0_10px_28px_rgba(23,54,81,0.06)] sm:p-6">
                  <h3 className="text-xl font-extrabold tracking-tight text-[#173651]">
                    {t("profilePage.previewTitle")}
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <PreviewCard
                      label={t("profilePage.previewPhone")}
                      value={form.phoneNumber || t("common.notSpecified")}
                    />
                    <PreviewCard
                      label={t("profilePage.previewAge")}
                      value={
                        form.age
                          ? t("profilePage.previewAgeYears", { age: form.age })
                          : t("common.notSpecified")
                      }
                    />
                    <PreviewCard
                      label={t("profilePage.previewCar")}
                      value={
                        [
                          form.carBrand,
                          form.carModel,
                          form.carColor,
                          form.carPlateNumber,
                        ]
                          .filter(Boolean)
                          .join(", ") || t("common.notSpecified")
                      }
                    />
                    <PreviewCard
                      label={t("profilePage.previewRating")}
                      value={`${rating}/5`}
                    />
                  </div>
                </div>

                {message && <div className="gomate-alert-success">{message}</div>}

                {error && <div className="gomate-alert-error">{error}</div>}

                <div className="mt-10 flex flex-col gap-4 pt-2 sm:mt-12">
                  <button
                    type="submit"
                    disabled={saving}
                    className="gomate-btn-gradient flex min-h-[3.75rem] w-full items-center justify-center rounded-full px-8 py-4 text-lg font-extrabold tracking-tight text-white shadow-[0_16px_42px_rgba(39,149,119,0.42)] ring-2 ring-white/35 transition-all duration-200 hover:brightness-[1.04] hover:shadow-[0_20px_48px_rgba(39,149,119,0.48)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:ring-white/15 sm:min-h-[4rem] sm:text-xl"
                  >
                    {saving ? t("profilePage.saving") : t("profilePage.save")}
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex min-h-[3rem] w-full items-center justify-center rounded-full border border-[#163c59]/28 bg-white/80 px-6 py-3 text-base font-semibold text-[#4a6678] shadow-[0_6px_18px_rgba(23,54,81,0.06)] ring-1 ring-[#d7e4eb]/90 transition hover:border-[#163c59]/40 hover:bg-white hover:text-[#29485d] sm:mx-auto sm:min-h-[3.25rem] sm:max-w-md sm:px-8"
                  >
                    {t("profilePage.logout")}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>

        <div className="gomate-mobile-tab-root md:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-5 items-end px-3 pb-3 pt-2.5 text-center">
            <a href="/" className="gomate-mobile-tab-link gomate-mobile-tab-link--active">
              <span className="text-[22px] leading-none">⌂</span>
              <span>{t("profilePage.mobileHome")}</span>
            </a>

            <a href="/trips" className="gomate-mobile-tab-link">
              <span className="text-[18px] leading-none">🧳</span>
              <span>{t("profilePage.mobileTrips")}</span>
            </a>

            <a href="/create-trip" className="-mt-6 flex flex-col items-center gap-1">
              <span className="gomate-fab">+</span>
            </a>

            <a href="/templates" className="gomate-mobile-tab-link">
              <span className="text-[18px] leading-none">🛣️</span>
              <span>{t("profilePage.mobileTemplates")}</span>
            </a>

            <button type="button" onClick={handleLogout} className="gomate-mobile-tab-link">
              <span className="text-[18px] leading-none">👤</span>
              <span>{t("profilePage.mobileLogout")}</span>
            </button>
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

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="gomate-info-tile border-[#e2eef5] bg-[#f9fcff]">
      <div className="text-sm font-semibold text-[#5d7485]">{label}</div>
      <div className="mt-2 text-base font-semibold leading-snug text-[#173651]">{value}</div>
    </div>
  );
}