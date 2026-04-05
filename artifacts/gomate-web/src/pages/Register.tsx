import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import {
  messageFromApiError,
  type ApiErrorPayload,
} from "../lib/errorMessages";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";

const REDIRECT_MS = 3500;

export default function Register() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
        }),
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        setErrorMessage(
          messageFromApiError(data as ApiErrorPayload, t, "auth.register.error")
        );
        return;
      }

      const rawMsg = data.message;
      const apiText =
        typeof rawMsg === "string" && rawMsg.trim() !== ""
          ? rawMsg.trim()
          : t("auth.register.verifySuccess");

      setSuccessMessage(apiText);
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
            <a
              href="/login"
              className="rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-[#28475d] shadow-sm backdrop-blur-sm"
            >
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
                <div className="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
                  <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-[#173651]">
                      {t("auth.register.formTitle")}
                    </h2>
                    <p className="mt-2 text-sm text-[#4a6678]">
                      {t("auth.register.subtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#28475d]">
                        {t("auth.register.name")}
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[#193549] shadow-sm outline-none placeholder:text-[#7a94a5] disabled:opacity-60"
                        placeholder="Yurii"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={formDisabled}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#28475d]">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[#193549] shadow-sm outline-none placeholder:text-[#7a94a5] disabled:opacity-60"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={formDisabled}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#28475d]">
                        {t("auth.login.password")}
                      </label>
                      <input
                        type="password"
                        className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[#193549] shadow-sm outline-none placeholder:text-[#7a94a5] disabled:opacity-60"
                        placeholder={t("auth.register.passwordHint")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={formDisabled}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || formDisabled}
                      className="flex h-14 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-8 text-lg font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] transition hover:scale-[1.01] disabled:opacity-70"
                    >
                      {loading
                        ? t("auth.register.submitting")
                        : t("auth.register.submit")}
                    </button>
                  </form>

                  {errorMessage && (
                    <div className="mt-4 rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318] shadow-sm">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="mt-4 space-y-3 rounded-2xl bg-[#e8f7e8] px-4 py-3 text-sm text-[#17663a] shadow-sm">
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
                </div>
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
