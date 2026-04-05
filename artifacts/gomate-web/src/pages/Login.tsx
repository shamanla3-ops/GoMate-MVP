import { useState } from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../lib/api";
import {
  messageFromApiError,
  type ApiErrorPayload,
} from "../lib/errorMessages";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";
import { staggerItemVariants } from "../lib/motionVariants";

export default function Login() {
  const { t, locale } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [resendOpen, setResendOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");
  const [resendError, setResendError] = useState("");

  function openResendPanel() {
    setResendOpen(true);
    setResendSuccess("");
    setResendError("");
    setResendEmail((prev) => (prev.trim() ? prev : email));
  }

  function closeResendPanel() {
    setResendOpen(false);
    setResendSuccess("");
    setResendError("");
    setResendLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          language: locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(messageFromApiError(data, t, "auth.login.error"));
        return;
      }

      const token = data.token;

      if (!token) {
        setMessage(t("auth.login.noToken"));
        return;
      }

      localStorage.setItem("token", token);
      window.location.href = "/";
    } catch {
      setMessage(t("auth.login.serverError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification(e: React.FormEvent) {
    e.preventDefault();
    setResendSuccess("");
    setResendError("");

    const addr = resendEmail.trim();
    if (!addr) {
      setResendError(t("auth.login.resendVerificationEmailRequired"));
      return;
    }

    setResendLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/resend-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: addr }),
        }
      );

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        setResendError(
          messageFromApiError(
            data as ApiErrorPayload,
            t,
            "auth.login.resendVerificationError"
          )
        );
        return;
      }

      const rawMsg = data.message;
      const apiText =
        typeof rawMsg === "string" && rawMsg.trim() !== ""
          ? rawMsg.trim()
          : t("auth.login.resendVerificationSuccess");
      setResendSuccess(apiText);
    } catch {
      setResendError(t("auth.login.serverError"));
    } finally {
      setResendLoading(false);
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

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-10">
          <AppPageHeader>
            <a href="/register" className="gomate-nav-pill">
              {t("auth.login.registerCta")}
            </a>
          </AppPageHeader>

          <main className="flex flex-1 items-center justify-center py-8">
            <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="hidden lg:block">
                <div className="max-w-xl">
                  <h1 className="text-5xl font-extrabold leading-[0.95] text-[#173651]">
                    {t("auth.login.heroTitle")}
                    <br />
                    {t("auth.login.heroTitleLine2")}
                  </h1>

                  <p className="mt-6 text-xl leading-relaxed text-[#35556c]">
                    {t("auth.login.lead")}
                  </p>

                  <div className="mt-8 space-y-3">
                    <Benefit text={t("auth.login.benefit1")} />
                    <Benefit text={t("auth.login.benefit2")} />
                    <Benefit text={t("auth.login.benefit3")} />
                  </div>
                </div>
              </section>

              <section className="mx-auto w-full max-w-md">
                <motion.div
                  variants={staggerItemVariants}
                  initial="hidden"
                  animate="show"
                  className="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8"
                >
                  <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-[#173651]">
                      {t("auth.login.formTitle")}
                    </h2>
                    <p className="mt-2 text-sm text-[#4a6678]">
                      {t("auth.login.subtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#28475d]">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[#193549] shadow-sm outline-none placeholder:text-[#7a94a5]"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#28475d]">
                        {t("auth.login.password")}
                      </label>
                      <input
                        type="password"
                        className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[#193549] shadow-sm outline-none placeholder:text-[#7a94a5]"
                        placeholder={t("auth.login.passwordPlaceholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="gomate-btn-gradient flex h-14 w-full items-center justify-center rounded-full px-8 text-lg font-bold text-white disabled:opacity-70"
                    >
                      {loading ? t("auth.login.submitting") : t("auth.login.submit")}
                    </button>
                  </form>

                  {message && (
                    <div className="mt-4 rounded-2xl bg-white/85 px-4 py-3 text-sm text-[#b42318] shadow-sm">
                      {message}
                    </div>
                  )}

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        resendOpen ? closeResendPanel() : openResendPanel()
                      }
                      className="text-sm font-semibold text-[#138fe3] underline-offset-2 hover:underline"
                    >
                      {t("auth.login.resendVerificationLink")}
                    </button>
                  </div>

                  {resendOpen && (
                    <div className="mt-4 rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
                      <p className="text-xs leading-relaxed text-[#5a7389]">
                        {t("auth.login.resendVerificationHint")}
                      </p>
                      <form
                        onSubmit={handleResendVerification}
                        className="mt-3 space-y-3"
                      >
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[#28475d]">
                            {t("auth.login.resendVerificationEmailLabel")}
                          </label>
                          <input
                            type="email"
                            className="w-full rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 text-sm text-[#193549] shadow-sm outline-none placeholder:text-[#7a94a5]"
                            placeholder="you@example.com"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            disabled={resendLoading}
                            autoComplete="email"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={resendLoading}
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-full bg-[#163c59] px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                          >
                            {resendLoading
                              ? t("auth.login.resendVerificationSubmitting")
                              : t("auth.login.resendVerificationSubmit")}
                          </button>
                          <button
                            type="button"
                            onClick={closeResendPanel}
                            disabled={resendLoading}
                            className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/80 bg-white/80 px-4 text-sm font-semibold text-[#28475d] shadow-sm hover:bg-white disabled:opacity-60"
                          >
                            {t("auth.login.resendVerificationClose")}
                          </button>
                        </div>
                      </form>
                      {resendSuccess && (
                        <div className="mt-3 rounded-xl border border-[#b6e6b6] bg-[#e8f7e8] px-3 py-2 text-xs font-medium leading-relaxed text-[#17663a]">
                          {resendSuccess}
                        </div>
                      )}
                      {resendError && (
                        <div className="mt-3 rounded-xl border border-[#fecdca] bg-[#fff1f0] px-3 py-2 text-xs font-medium leading-relaxed text-[#b42318]">
                          {resendError}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 text-center text-sm text-[#4a6678]">
                    {t("auth.login.noAccount")}{" "}
                    <a
                      href="/register"
                      className="font-bold text-[#138fe3] hover:underline"
                    >
                      {t("auth.login.registerLink")}
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
  return (
    <div className="rounded-[22px] border border-white/70 bg-white/55 px-4 py-3 text-[#28475d] shadow-sm backdrop-blur-sm">
      {text}
    </div>
  );
}
