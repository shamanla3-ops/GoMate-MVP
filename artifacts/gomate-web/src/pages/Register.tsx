import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import {
  messageFromApiError,
  type ApiErrorPayload,
} from "../lib/errorMessages";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { staggerItemVariants } from "../lib/motionVariants";

const REDIRECT_MS = 3500;
const TERMS_MARKER = "[[terms]]";

function RegisterAcceptTermsLabel() {
  const { t } = useTranslation();
  const raw = t("auth.register.acceptTerms");
  const parts = raw.split(TERMS_MARKER);
  const linkClass =
    "font-semibold text-[#138fe3] underline decoration-[#138fe3]/35 underline-offset-2 hover:decoration-[#138fe3]";

  if (parts.length === 2) {
    return (
      <>
        {parts[0]}
        <Link to="/terms" className={linkClass}>
          {t("auth.register.termsOfUse")}
        </Link>
        {parts[1]}
      </>
    );
  }

  return (
    <>
      {raw}{" "}
      <Link to="/terms" className={linkClass}>
        {t("auth.register.termsOfUse")}
      </Link>
    </>
  );
}

export default function Register() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const supportMailHref = useMemo(() => {
    const addr = t("auth.register.supportEmail");
    const subject = encodeURIComponent(t("auth.register.supportMailSubject"));
    return `mailto:${addr}?subject=${subject}`;
  }, [t, locale]);

  useEffect(() => {
    if (!successMessage) return;
    const id = window.setTimeout(() => {
      navigate("/login");
    }, REDIRECT_MS);
    return () => window.clearTimeout(id);
  }, [successMessage, navigate]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setTermsError("");

    if (!acceptTerms) {
      setTermsError(t("auth.register.mustAcceptTerms"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          language: locale,
          termsAccepted: true,
        }),
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        setErrorMessage(
          messageFromApiError(data as ApiErrorPayload, t, "auth.register.error")
        );
        return;
      }

      setSuccessMessage(t("auth.register.verifySuccess"));
      setPassword("");
    } catch {
      setErrorMessage(t("auth.register.serverError"));
    } finally {
      setLoading(false);
    }
  }

  const formDisabled = Boolean(successMessage);

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

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-10">
          <AppPageHeader>
            <a href="/login" className="gomate-nav-pill">
              {t("auth.register.loginCta")}
            </a>
          </AppPageHeader>

          <main className="flex flex-1 items-center justify-center py-8">
            <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="hidden lg:block">
                <div className="max-w-xl">
                  <h1 className="text-5xl font-extrabold leading-[0.95] text-[#173651]">
                    {t("auth.register.heroTitle")}
                    <br />
                    {t("auth.register.heroTitleLine2")}
                  </h1>

                  <p className="mt-6 text-xl leading-relaxed text-[#35556c]">
                    {t("auth.register.lead")}
                  </p>

                  <div className="mt-8 space-y-3">
                    <Benefit text={t("auth.register.benefit1")} />
                    <Benefit text={t("auth.register.benefit2")} />
                    <Benefit text={t("auth.register.benefit3")} />
                  </div>
                </div>
              </section>

              <section className="mx-auto w-full max-w-md">
                <motion.div
                  variants={staggerItemVariants}
                  initial="hidden"
                  animate="show"
                  className="gomate-glass-panel p-6 sm:p-8"
                >
                  <div className="text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#173651]">
                      {t("auth.register.formTitle")}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#4a6678]">
                      {t("auth.register.subtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="mt-7 space-y-5">
                    <div>
                      <label className="gomate-field-label">{t("auth.register.name")}</label>
                      <input
                        type="text"
                        className="gomate-field-input disabled:opacity-60"
                        placeholder={t("auth.register.namePlaceholder")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={formDisabled}
                      />
                    </div>

                    <div>
                      <label className="gomate-field-label">{t("auth.register.email")}</label>
                      <input
                        type="email"
                        className="gomate-field-input disabled:opacity-60"
                        placeholder={t("auth.register.emailPlaceholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={formDisabled}
                      />
                    </div>

                    <div>
                      <label className="gomate-field-label">{t("auth.login.password")}</label>
                      <input
                        type="password"
                        className="gomate-field-input disabled:opacity-60"
                        placeholder={t("auth.register.passwordHint")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={formDisabled}
                      />
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/45 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:px-4 sm:py-4">
                      <label className="flex cursor-pointer gap-3 text-left">
                        <input
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setAcceptTerms(next);
                            if (next) setTermsError("");
                          }}
                          disabled={formDisabled}
                          className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 rounded border-[#b8c9d6] text-[#1296e8] focus:ring-2 focus:ring-[#1296e8]/35 disabled:opacity-60"
                        />
                        <span className="text-sm leading-snug text-[#35556c]">
                          <RegisterAcceptTermsLabel />
                        </span>
                      </label>
                      {termsError ? (
                        <p
                          className="mt-2 text-sm font-medium text-[#b42318]"
                          role="alert"
                        >
                          {termsError}
                        </p>
                      ) : null}
                      <p className="mt-2.5 text-xs leading-relaxed text-[#5a7389]">
                        {t("auth.register.legalNote")}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || formDisabled}
                      className="gomate-btn-gradient flex h-14 w-full items-center justify-center rounded-full px-8 text-lg font-bold text-white disabled:opacity-70"
                    >
                      {loading
                        ? t("auth.register.submitting")
                        : t("auth.register.submit")}
                    </button>
                  </form>

                  <a
                    href={supportMailHref}
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-full border border-[#cfe8f7] bg-white/70 text-sm font-semibold text-[#28475d] shadow-sm backdrop-blur-sm transition hover:border-[#1296e8]/40 hover:bg-white/90"
                  >
                    {t("auth.register.contactSupport")}
                  </a>

                  {errorMessage && (
                    <div className="gomate-alert-error mt-4">{errorMessage}</div>
                  )}

                  {successMessage && (
                    <div className="gomate-alert-success mt-4 space-y-3">
                      <p className="font-semibold">{successMessage}</p>
                      <p className="text-xs text-[#35556c]">
                        {t("auth.register.redirectHint")}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="flex h-11 w-full items-center justify-center rounded-full border border-[#17663a]/30 bg-white px-6 text-sm font-bold text-[#17663a] shadow-sm transition hover:bg-[#f0faf0]"
                      >
                        {t("auth.register.goToLogin")}
                      </button>
                    </div>
                  )}

                  <div className="mt-6 text-center text-sm text-[#4a6678]">
                    {t("auth.register.hasAccount")}{" "}
                    <a
                      href="/login"
                      className="font-bold text-[#138fe3] hover:underline"
                    >
                      {t("auth.register.signInLink")}
                    </a>
                  </div>
                </motion.div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return <div className="gomate-benefit-strip">{text}</div>;
}
