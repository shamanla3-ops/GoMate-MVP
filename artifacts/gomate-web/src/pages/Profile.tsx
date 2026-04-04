import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { type CurrentUser } from "../lib/auth";

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

type ReviewItem = {
  id: string;
  tripId: string;
  tripLabel: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

function Header({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void;
}) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <a href="/" className="flex items-center">
        <img
          src="/gomate-logo.png"
          alt="GoMate"
          className="h-12 w-auto sm:h-14 lg:h-16"
        />
      </a>

      <nav className="hidden items-center gap-3 md:flex">
        <a
          href="/"
          className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
        >
          Главная
        </a>
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
          href="/profile"
          className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          {userName}
        </a>
        <button
          onClick={onLogout}
          className="rounded-full border border-white/90 bg-white/88 px-4 py-2 text-sm font-semibold text-[#29485d] shadow-sm backdrop-blur-sm"
        >
          Выйти из аккаунта
        </button>
      </nav>
    </header>
  );
}

export default function Profile() {
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
        setError(data.error || "Не удалось загрузить профиль");
        return;
      }

      const profileUser: CurrentUser = data.user;
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
      setError("Не удалось подключиться к серверу");
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
      setError("Можно загрузить только изображение");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Файл слишком большой. Максимум 5 МБ");
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
        setError(data.error || "Не удалось сохранить профиль");
        return;
      }

      setUser(data.user);
      setMessage(data.message || "Профиль сохранён");
    } catch {
      setError("Не удалось подключиться к серверу");
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
      <div className="min-h-screen flex items-center justify-center bg-[#eef4f8] text-[#193549]">
        Загрузка профиля...
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
          <Header userName={displayName} onLogout={handleLogout} />

          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="rounded-[30px] border border-white/60 bg-white/50 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm">
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

                <h1 className="mt-4 text-3xl font-extrabold text-[#173651]">
                  {displayName}
                </h1>

                <p className="mt-1 text-sm text-[#5d7485]">{user?.email}</p>

                <div className="mt-5 w-full rounded-[24px] bg-white/85 p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#5d7485]">
                    Рейтинг водителя
                  </div>
                  <div className="mt-2 text-3xl text-[#f4b400]">
                    {renderStars(rating)}
                  </div>
                  <div className="mt-2 text-sm text-[#35556c]">
                    {rating} из 5 звёзд
                  </div>
                  <div className="mt-1 text-xs text-[#7a94a5]">
                    Отзывов: {reviewCount}
                  </div>
                </div>

                <div className="mt-4 w-full rounded-[24px] bg-[linear-gradient(180deg,#dff7d4_0%,#ebf8ff_100%)] p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#4e6b5f]">
                    Сэкономлено CO₂
                  </div>
                  <div className="mt-2 text-4xl font-extrabold text-[#173651]">
                    {co2SavedKg}
                    <span className="ml-2 text-lg font-semibold text-[#5d7485]">
                      кг
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#486476]">
                    Этот показатель позже можно будет автоматически увеличивать
                    после завершённых совместных поездок.
                  </p>
                </div>

                <div className="mt-5 w-full rounded-[24px] bg-white/85 p-4 text-left shadow-sm">
                  <div className="text-sm font-semibold text-[#5d7485]">
                    Отзывы о вас
                  </div>
                  {reviewsLoading ? (
                    <p className="mt-3 text-sm text-[#5d7485]">Загрузка…</p>
                  ) : reviews.length === 0 ? (
                    <p className="mt-3 text-sm text-[#5d7485]">
                      Пока нет отзывов после поездок.
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
                          <div className="text-lg text-[#f4b400]">
                            {renderStars(r.rating)}
                          </div>
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

            <section className="rounded-[30px] border border-white/60 bg-white/50 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
              <div>
                <h2 className="text-3xl font-extrabold text-[#173651]">
                  Профиль пользователя
                </h2>
                <p className="mt-2 text-[#4a6678]">
                  Заполни профиль, чтобы пассажиры и водители больше доверяли
                  друг другу.
                </p>
              </div>

              <form onSubmit={handleSave} className="mt-8 space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#28475d]">
                      Аватар
                    </label>
                    <div className="rounded-[24px] border border-dashed border-white/90 bg-white/80 p-4 shadow-sm">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="block w-full text-sm text-[#35556c] file:mr-4 file:rounded-full file:border-0 file:bg-[#163c59] file:px-4 file:py-2 file:font-semibold file:text-white"
                      />
                      <p className="mt-3 text-sm text-[#5d7485]">
                        Загрузи JPG или PNG. Максимальный размер — 5 МБ.
                      </p>
                    </div>
                  </div>

                  <Field
                    label="Имя"
                    value={form.name}
                    onChange={(value) => handleChange("name", value)}
                    placeholder="Yurii"
                  />

                  <Field
                    label="Возраст"
                    type="number"
                    value={form.age}
                    onChange={(value) => handleChange("age", value)}
                    placeholder="30"
                  />

                  <Field
                    label="Номер телефона"
                    value={form.phoneNumber}
                    onChange={(value) => handleChange("phoneNumber", value)}
                    placeholder="+48 000 000 000"
                  />

                  <Field
                    label="Марка автомобиля"
                    value={form.carBrand}
                    onChange={(value) => handleChange("carBrand", value)}
                    placeholder="Skoda"
                  />

                  <Field
                    label="Модель автомобиля"
                    value={form.carModel}
                    onChange={(value) => handleChange("carModel", value)}
                    placeholder="Superb"
                  />

                  <Field
                    label="Цвет автомобиля"
                    value={form.carColor}
                    onChange={(value) => handleChange("carColor", value)}
                    placeholder="Серый"
                  />

                  <Field
                    label="Номер автомобиля"
                    value={form.carPlateNumber}
                    onChange={(value) => handleChange("carPlateNumber", value)}
                    placeholder="ZS 12345"
                  />
                </div>

                <div className="rounded-[24px] bg-white/80 p-5 shadow-sm">
                  <h3 className="text-xl font-extrabold text-[#173651]">
                    Как профиль выглядит для других
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <PreviewCard
                      label="Телефон"
                      value={form.phoneNumber || "Не указан"}
                    />
                    <PreviewCard
                      label="Возраст"
                      value={form.age ? `${form.age} лет` : "Не указан"}
                    />
                    <PreviewCard
                      label="Автомобиль"
                      value={
                        [
                          form.carBrand,
                          form.carModel,
                          form.carColor,
                          form.carPlateNumber,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Не указан"
                      }
                    />
                    <PreviewCard label="Рейтинг" value={`${rating}/5`} />
                  </div>
                </div>

                {message && (
                  <div className="rounded-2xl bg-[#e8f7e8] px-4 py-3 text-sm text-[#17663a] shadow-sm">
                    {message}
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318] shadow-sm">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-14 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-8 text-lg font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] transition hover:scale-[1.01] disabled:opacity-70"
                  >
                    {saving ? "Сохраняем..." : "Сохранить профиль"}
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex h-14 items-center justify-center rounded-full border border-white/90 bg-white/88 px-8 text-lg font-semibold text-[#29485d] shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:scale-[1.01]"
                  >
                    Выйти из аккаунта
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/70 bg-white/88 backdrop-blur-md md:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-5 items-end px-3 pb-3 pt-2 text-center text-[11px] text-[#4d697c]">
            <a
              href="/"
              className="flex flex-col items-center gap-1 font-semibold text-[#18a04f]"
            >
              <span className="text-[22px] leading-none">⌂</span>
              <span>Главная</span>
            </a>

            <a href="/trips" className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">🧳</span>
              <span>Поездки</span>
            </a>

            <a href="/create-trip" className="-mt-6 flex flex-col items-center gap-1">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-[34px] text-white shadow-[0_10px_20px_rgba(31,145,140,0.35)]">
                +
              </span>
            </a>

            <a href="/templates" className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">🛣️</span>
              <span>Маршруты</span>
            </a>

            <button onClick={handleLogout} className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">👤</span>
              <span>Выход</span>
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

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/80 bg-[#f8fcff] p-4 shadow-sm">
      <div className="text-sm font-semibold text-[#5d7485]">{label}</div>
      <div className="mt-2 text-base font-semibold text-[#173651]">{value}</div>
    </div>
  );
}