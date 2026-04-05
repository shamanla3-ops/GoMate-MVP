import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import {
  messageFromApiError,
  type ApiErrorPayload,
} from "../lib/errorMessages";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";

type Phase = "loading" | "success" | "error";

function VerifyEmailShell({
  children,
  footerExtra,
}: {
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
              {t("auth.verify.goToLogin")}
            </a>
          </AppPageHeader>

          <main className="flex flex-1 items-center justify-center py-8">
            <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="hidden lg:block">
                <div className="max-w-xl">
                  <h1 className="text-5xl font-extrabold leading-[0.95] text-[#173651]">
                    {t("auth.verify.title")}
                  </h1>
                  <p className="mt-6 text-xl leading-relaxed text-[#35556c]">
                    {t("auth.verify.subtitle")}
                  </p>
                </div>
              </section>

              <section className="mx-auto w-full max-w-md">
                <div className="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-extrabold text-[#173651] sm:text-3xl">
                      {t("auth.verify.title")}
                    </h2>
                  </div>

                  <div className="mt-6 min-h-[4.5rem] text-center">{children}</div>

                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-8 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] transition hover:scale-[1.01]"
                  >
                    {t("auth.verify.goToLogin")}
                  </button>

                  {footerExtra}

                  <div className="mt-6 text-center text-sm text-[#4a6678]">
                    <a
                      href="/"
                      className="font-bold text-[#138fe3] hover:underline"
                    >
                      {t("nav.home")}
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

function VerifyWithToken({ token }: { token: string }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      setPhase("loading");
      setErrorText("");

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = (await response.json()) as Record<string, unknown>;

        if (cancelled) return;

        if (!response.ok) {
          setPhase("error");
          const payload = data as ApiErrorPayload;
          const backendMsg =
            typeof payload.message === "string" && payload.message.trim()
              ? payload.message.trim()
              : typeof payload.error === "string" && payload.error.trim()
                ? payload.error.trim()
                : "";
          setErrorText(
            backendMsg ||
              messageFromApiError(payload, t, "auth.verify.failed")
          );
          return;
        }

        setPhase("success");
      } catch {
        if (!cancelled) {
          setPhase("error");
          setErrorText(t("auth.verify.failed"));
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  return (
    <VerifyEmailShell>
      {phase === "loading" && (
        <p className="text-base font-medium text-[#35556c]">
          {t("auth.verify.loading")}
        </p>
      )}
      {phase === "success" && (
        <div className="rounded-2xl bg-[#e8f7e8] px-4 py-3 text-sm font-semibold text-[#17663a] shadow-sm">
          {t("auth.verify.success")}
        </div>
      )}
      {phase === "error" && (
        <div className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318] shadow-sm">
          {errorText || t("auth.verify.failed")}
        </div>
      )}
    </VerifyEmailShell>
  );
}

export default function VerifyEmail() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return (
      <VerifyEmailShell>
        <div className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318] shadow-sm">
          {t("auth.verify.tokenMissing")}
        </div>
      </VerifyEmailShell>
    );
  }

  return <VerifyWithToken token={token} />;
}
