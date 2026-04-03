import { useEffect, useState } from "react";
import { getCurrentUser, type CurrentUser } from "../lib/auth";
import { useTranslation, LanguageSwitcher } from "../i18n";

function getUserShortName(name: string, profileFallback: string) {
  const clean = name.trim();
  if (!clean) return profileFallback;

  const parts = clean.split(" ").filter(Boolean);
  return parts[0] || profileFallback;
}

export default function Landing() {
  const { t } = useTranslation();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef4f8]">
        <div className="text-lg text-gray-600">{t("landing.loading")}</div>
      </div>
    );
  }

  const findTripHref = user ? "/trips" : "/login";
  const publishTripHref = user ? "/create-trip" : "/register";
  const templatesHref = user ? "/templates" : "/login";
  const requestsHref = user ? "/requests" : "/login";
  const chatsHref = user ? "/chats" : "/login";

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

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-6 sm:px-6 lg:px-10">
          <header className="flex items-center justify-between gap-3 py-2">
            <a href="/" className="flex min-w-0 shrink items-center">
              <img
                src="/gomate-logo.png"
                alt="GoMate"
                className="h-14 w-auto sm:h-16 lg:h-20"
              />
            </a>

            <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <nav className="hidden items-center gap-3 md:flex">
                <a
                  href="/"
                  className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
                >
                  {t("nav.home")}
                </a>
                <a
                  href={findTripHref}
                  className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
                >
                  {t("nav.trips")}
                </a>
                <a
                  href={templatesHref}
                  className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
                >
                  {t("nav.templates")}
                </a>
                <a
                  href={requestsHref}
                  className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
                >
                  {t("nav.requests")}
                </a>
                <a
                  href={chatsHref}
                  className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#28475d] shadow-sm backdrop-blur-sm"
                >
                  {t("nav.chats")}
                </a>

                {user ? (
                  <a
                    href="/profile"
                    className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
                  >
                    {getUserShortName(user.name, t("profile.shortName"))}
                  </a>
                ) : (
                  <a
                    href="/login"
                    className="rounded-full bg-[#163c59] px-4 py-2 text-sm font-semibold text-white shadow-sm"
                  >
                    {t("nav.login")}
                  </a>
                )}
              </nav>
            </div>
          </header>

          <main className="flex flex-1 items-center">
            <div className="grid w-full items-center gap-8 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
              <section className="mx-auto w-full max-w-2xl lg:mx-0">
                <div className="rounded-[34px] border border-white/60 bg-white/30 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
                  <h1 className="max-w-3xl text-4xl font-extrabold leading-[0.95] text-[#173651] sm:text-5xl lg:text-6xl">
                    {t("landing.title.line1")}
                    <br />
                    {t("landing.title.line2")}
                    <br />
                    {t("landing.title.line3")}
                    <br />
                    {t("landing.title.line4")}
                  </h1>

                  <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#35556c] sm:text-xl">
                    {t("landing.subtitle")}
                  </p>

                  <p className="mt-4 text-base font-medium text-[#426277] sm:text-lg">
                    {t("landing.ecoLine")}
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a
                      href={findTripHref}
                      className="flex h-14 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-8 text-lg font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] transition hover:scale-[1.01]"
                    >
                      {t("landing.findTrip")}
                      <span className="ml-3 text-2xl leading-none">›</span>
                    </a>

                    <a
                      href={publishTripHref}
                      className="flex h-14 items-center justify-center rounded-full border border-white/90 bg-white/88 px-8 text-lg font-semibold text-[#29485d] shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:scale-[1.01]"
                    >
                      {t("landing.publishTrip")}
                      <span className="ml-3 text-2xl leading-none text-[#8ca0ae]">
                        ›
                      </span>
                    </a>

                    <a
                      href={requestsHref}
                      className="flex h-14 items-center justify-center rounded-full border border-white/90 bg-white/88 px-8 text-lg font-semibold text-[#29485d] shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:scale-[1.01]"
                    >
                      {t("landing.requests")}
                      <span className="ml-3 text-2xl leading-none text-[#8ca0ae]">
                        ›
                      </span>
                    </a>

                    <a
                      href={chatsHref}
                      className="flex h-14 items-center justify-center rounded-full border border-white/90 bg-white/88 px-8 text-lg font-semibold text-[#29485d] shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:scale-[1.01]"
                    >
                      {t("landing.chats")}
                      <span className="ml-3 text-2xl leading-none text-[#8ca0ae]">
                        ›
                      </span>
                    </a>
                  </div>

                  {!user && (
                    <p className="mt-5 text-sm text-[#4a6678]">
                      {t("landing.guestNote")}
                    </p>
                  )}
                </div>
              </section>

              <section className="mx-auto w-full max-w-xl lg:max-w-none">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <FeatureCard
                    icon="🚌"
                    title={t("landing.feature.comfort.title")}
                    text={t("landing.feature.comfort.text")}
                  />
                  <FeatureCard
                    icon="💶"
                    title={t("landing.feature.savings.title")}
                    text={t("landing.feature.savings.text")}
                  />
                  <FeatureCard
                    icon="⏱️"
                    title={t("landing.feature.faster.title")}
                    text={t("landing.feature.faster.text")}
                  />
                  <FeatureCard
                    icon="⛽"
                    title={t("landing.feature.drivers.title")}
                    text={t("landing.feature.drivers.text")}
                  />
                </div>
              </section>
            </div>
          </main>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/70 bg-white/88 backdrop-blur-md md:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-5 items-end px-3 pb-3 pt-2 text-center text-[11px] text-[#4d697c]">
            <a
              href="/"
              className="flex flex-col items-center gap-1 font-semibold text-[#18a04f]"
            >
              <span className="text-[22px] leading-none">⌂</span>
              <span>{t("nav.home")}</span>
            </a>

            <a href={findTripHref} className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">🧳</span>
              <span>{t("nav.trips")}</span>
            </a>

            <a
              href={publishTripHref}
              className="-mt-6 flex flex-col items-center gap-1"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-[34px] text-white shadow-[0_10px_20px_rgba(31,145,140,0.35)]">
                +
              </span>
            </a>

            <a href={requestsHref} className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">📩</span>
              <span>{t("nav.requests")}</span>
            </a>

            <a href={chatsHref} className="flex flex-col items-center gap-1">
              <span className="text-[18px] leading-none">💬</span>
              <span>{t("nav.chats")}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/72 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#85d95a_0%,#1093e6_100%)] text-[20px] shadow-md">
          <span>{icon}</span>
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-[#1f3548]">{title}</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-[#3d5668]">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
