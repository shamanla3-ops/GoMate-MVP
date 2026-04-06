import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getCurrentUser, type CurrentUser } from "../lib/auth";
import { useTranslation, LanguageSwitcher } from "../i18n";
import { useNotificationCounts } from "../context/NotificationCountsContext";
import {
  headerRevealTransition,
  headerRevealVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "../lib/motionVariants";

function getUserShortName(name: string, profileFallback: string) {
  const clean = name.trim();
  if (!clean) return profileFallback;

  const parts = clean.split(" ").filter(Boolean);
  return parts[0] || profileFallback;
}

function getProfileAvatarLetters(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function NavBadge({ count }: { count: number }) {
  if (count < 1) {
    return null;
  }

  const display = count > 99 ? "99+" : String(count);

  return (
    <span
      className="pointer-events-none absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#b42318] px-1 text-[10px] font-bold leading-none text-white shadow-sm"
      aria-hidden
    >
      {display}
    </span>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const { chatsUnread, requestsPending, refresh } = useNotificationCounts();
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

  useEffect(() => {
    if (!loading && user) {
      void refresh();
    }
  }, [loading, user, refresh]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#eef4f8] px-4 text-[#4a6678]">
        <span className="gomate-spinner" aria-hidden />
        <span className="text-base font-medium">{t("landing.loading")}</span>
      </div>
    );
  }

  const findTripHref = user ? "/trips" : "/login";
  const publishTripHref = user ? "/create-trip" : "/register";
  const templatesHref = user ? "/templates" : "/login";
  const requestsHref = user ? "/requests" : "/login";
  const chatsHref = user ? "/chats" : "/login";
  const profileHref = user ? "/profile" : "/login";

  const totalNotifications = user ? chatsUnread + requestsPending : 0;

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
          <motion.header
            initial="hidden"
            animate="show"
            variants={headerRevealVariants}
            transition={headerRevealTransition}
            className="sticky top-0 z-30 -mx-4 mb-2 flex items-center justify-between gap-3 border-b border-white/58 bg-white/52 py-3.5 px-4 shadow-[0_12px_44px_rgba(23,54,81,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/40 sm:-mx-6 sm:mb-4 sm:px-6"
          >
            <motion.a
              href="/"
              className="gomate-icon-pop relative flex min-w-0 shrink items-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title={
                user && totalNotifications > 0
                  ? t("nav.badge.totalHint", { count: totalNotifications })
                  : undefined
              }
            >
              <img
                src="/gomate-logo.png"
                alt="GoMate"
                className="h-14 w-auto sm:h-16 lg:h-20"
              />
              {user && totalNotifications > 0 ? (
                <span
                  className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#b42318] ring-2 ring-white"
                  aria-hidden
                />
              ) : null}
            </motion.a>

            <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 md:gap-3">
                <LanguageSwitcher />
                <a
                  href={profileHref}
                  className="md:hidden flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/90 px-2 text-[11px] font-extrabold leading-none tracking-tight text-[#163c59] shadow-[0_8px_22px_rgba(23,54,81,0.12)] ring-1 ring-white/90 backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8] motion-safe:active:scale-[0.97]"
                  aria-label={user ? t("nav.profile") : t("nav.login")}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] text-[12px] font-extrabold text-white shadow-inner ring-2 ring-white/70"
                    aria-hidden
                  >
                    {user ? getProfileAvatarLetters(user.name) : "?"}
                  </span>
                </a>
              </div>
              <nav className="hidden items-center gap-3 md:flex">
                <a href="/" className="gomate-nav-pill font-medium">
                  {t("nav.home")}
                </a>
                <a href={findTripHref} className="gomate-nav-pill font-medium">
                  {t("nav.trips")}
                </a>
                <a href={templatesHref} className="gomate-nav-pill font-medium">
                  {t("nav.templates")}
                </a>
                <a
                  href={requestsHref}
                  className="gomate-nav-pill relative font-medium"
                  aria-label={
                    user && requestsPending > 0
                      ? t("nav.badge.requestsAria", { count: requestsPending })
                      : undefined
                  }
                >
                  {t("nav.requests")}
                  {user ? <NavBadge count={requestsPending} /> : null}
                </a>
                <a
                  href={chatsHref}
                  className="gomate-nav-pill relative font-medium"
                  aria-label={
                    user && chatsUnread > 0
                      ? t("nav.badge.chatsAria", { count: chatsUnread })
                      : undefined
                  }
                >
                  {t("nav.chats")}
                  {user ? <NavBadge count={chatsUnread} /> : null}
                </a>

                {user ? (
                  <a href="/profile" className="gomate-nav-pill-dark">
                    {getUserShortName(user.name, t("profile.shortName"))}
                  </a>
                ) : (
                  <a href="/login" className="gomate-nav-pill-dark">
                    {t("nav.login")}
                  </a>
                )}
              </nav>
            </div>
          </motion.header>

          <motion.main
            className="flex flex-1 items-center"
            variants={staggerItemVariants}
            initial="hidden"
            animate="show"
          >
            <div className="grid w-full items-center gap-8 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
              <section className="mx-auto w-full max-w-2xl lg:mx-0">
                <div className="gomate-glass-hero">
                  <h1 className="max-w-3xl text-4xl font-extrabold leading-[0.95] tracking-tight text-[#173651] sm:text-5xl lg:text-6xl">
                    {t("landing.title.line1")}
                    <br />
                    {t("landing.title.line2")}
                    <br />
                    {t("landing.title.line3")}
                    <br />
                    {t("landing.title.line4")}
                  </h1>

                  <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#35556c] sm:text-xl sm:leading-relaxed">
                    {t("landing.subtitle")}
                  </p>

                  <p className="mt-5 text-base font-medium leading-snug text-[#3d5a6e] sm:text-lg">
                    {t("landing.ecoLine")}
                  </p>

                  <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a
                      href={findTripHref}
                      className="gomate-btn-gradient flex min-h-[3.5rem] items-center justify-center rounded-full px-8 text-lg font-bold text-white"
                    >
                      {t("landing.findTrip")}
                      <span className="ml-3 text-2xl leading-none opacity-90">›</span>
                    </a>

                    <a href={publishTripHref} className="gomate-btn-secondary px-8 text-lg">
                      {t("landing.publishTrip")}
                      <span className="ml-3 text-2xl leading-none text-[#8ca0ae]">›</span>
                    </a>

                    <a
                      href={requestsHref}
                      className="gomate-btn-secondary relative px-8 text-lg"
                      aria-label={
                        user && requestsPending > 0
                          ? t("nav.badge.requestsAria", {
                              count: requestsPending,
                            })
                          : undefined
                      }
                    >
                      {t("landing.requests")}
                      {user ? <NavBadge count={requestsPending} /> : null}
                      <span className="ml-3 text-2xl leading-none text-[#8ca0ae]">
                        ›
                      </span>
                    </a>

                    <a
                      href={chatsHref}
                      className="gomate-btn-secondary relative px-8 text-lg"
                      aria-label={
                        user && chatsUnread > 0
                          ? t("nav.badge.chatsAria", { count: chatsUnread })
                          : undefined
                      }
                    >
                      {t("landing.chats")}
                      {user ? <NavBadge count={chatsUnread} /> : null}
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
                <motion.div
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="show"
                >
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
                </motion.div>
              </section>
            </div>
          </motion.main>
        </div>

        <div className="gomate-mobile-tab-root md:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-5 items-end px-3 pb-3 pt-2 text-center">
            <a
              href="/"
              className="gomate-mobile-tab-link gomate-mobile-tab-link--active"
            >
              <span className="text-[22px] leading-none">⌂</span>
              <span>{t("nav.home")}</span>
            </a>

            <a href={findTripHref} className="gomate-mobile-tab-link">
              <span className="text-[18px] leading-none">🧳</span>
              <span>{t("nav.trips")}</span>
            </a>

            <a
              href={publishTripHref}
              className="-mt-6 flex flex-col items-center gap-1"
            >
              <span className="gomate-fab">+</span>
            </a>

            <a
              href={requestsHref}
              className="relative flex flex-col items-center gap-1"
              aria-label={
                user && requestsPending > 0
                  ? t("nav.badge.requestsAria", { count: requestsPending })
                  : undefined
              }
            >
              <span className="relative text-[18px] leading-none">
                📩
                {user ? <NavBadge count={requestsPending} /> : null}
              </span>
              <span>{t("nav.requests")}</span>
            </a>

            <a
              href={chatsHref}
              className="gomate-mobile-tab-link relative"
              aria-label={
                user && chatsUnread > 0
                  ? t("nav.badge.chatsAria", { count: chatsUnread })
                  : undefined
              }
            >
              <span className="relative text-[18px] leading-none">
                💬
                {user ? <NavBadge count={chatsUnread} /> : null}
              </span>
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
    <motion.div
      variants={staggerItemVariants}
      className="gomate-lift-card p-5 backdrop-blur-sm"
    >
      <div className="flex items-start gap-4">
        <div className="gomate-icon-pop flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#8adf63_0%,#1190e6_100%)] text-[22px] shadow-[0_10px_24px_rgba(25,151,232,0.28)] ring-2 ring-white/50">
          <span aria-hidden>{icon}</span>
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-extrabold tracking-tight text-[#1f3548] sm:text-xl">
            {title}
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-[#3d5668]">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}
