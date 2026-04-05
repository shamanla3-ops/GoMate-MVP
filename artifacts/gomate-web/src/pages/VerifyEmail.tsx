import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import {
  messageFromApiError,
  type ApiErrorPayload,
} from "../lib/errorMessages";
import { useTranslation } from "../i18n";
import { AppPageHeader } from "../components/AppPageHeader";

type VerifyPhase = "loading" | "success" | "error";

const LOGIN_REDIRECT_MS = 3000;

function parseVerifyErrorMessage(
  data: Record<string, unknown>,
  t: (key: string) => string
): string {
  const payload = data as ApiErrorPayload;
  const backendMsg =
    typeof payload.message === "string" && payload.message.trim()
      ? payload.message.trim()
      : typeof payload.error === "string" && payload.error.trim()
        ? payload.error.trim()
        : "";
  return (
    backendMsg ||
    messageFromApiError(payload, t, "auth.verify.invalidOrExpired")
  );
}

type CardTone = "loading" | "success" | "error";

function VerifyEmailLayout({
  cardHeadline,
  cardSubline,
  cardTone,
  panelText,
  showSpinner,
  primaryButton,
  belowPrimary,
}: {
  cardHeadline: string;
  cardSubline?: string;
  cardTone: CardTone;
  panelText?: string;
  showSpinner?: boolean;
  primaryButton: { label: string; onClick: () => void } | null;
  belowPrimary?: React.ReactNode;
}) {
  const { t } = useTranslation();

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
                <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-extrabold text-[#173651] sm:text-3xl">
                      {cardHeadline}
                    </h2>
                    {cardSubline ? (
                      <p className="mt-3 text-sm leading-relaxed text-[#4a6678] sm:text-base">
                        {cardSubline}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-8">
                    {cardTone === "loading" && showSpinner ? (
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className="h-10 w-10 rounded-full border-[3px] border-[#cfe8f7] border-t-[#1296e8] animate-spin"
                          aria-hidden
                        />
                      </div>
                    ) : null}

                    {cardTone === "success" && panelText ? (
                      <div className="rounded-2xl border border-[#b6e6b6] bg-[#e8f7e8] px-4 py-4 text-center shadow-sm">
                        <p className="text-sm font-semibold leading-relaxed text-[#17663a] sm:text-base">
                          {panelText}
                        </p>
                      </div>
                    ) : null}

                    {cardTone === "error" && panelText ? (
                      <div className="rounded-2xl border border-[#fecdca] bg-[#fff1f0] px-4 py-4 text-center shadow-sm">
                        <p className="text-sm font-medium leading-relaxed text-[#b42318] sm:text-base">
                          {panelText}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {primaryButton ? (
                    <button
                      type="button"
                      onClick={primaryButton.onClick}
                      className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-8 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] transition hover:scale-[1.01]"
                    >
                      {primaryButton.label}
                    </button>
                  ) : null}

                  {belowPrimary}

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
  const navigate = useNavigate();
  const [phase, setPhase] = useState<VerifyPhase>("loading");
  const [errorDetail, setErrorDetail] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      setPhase("loading");
      setErrorDetail("");

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
          setErrorDetail(parseVerifyErrorMessage(data, t));
          return;
        }

        setPhase("success");
      } catch {
        if (!cancelled) {
          setPhase("error");
          setErrorDetail(t("auth.verify.failed"));
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  useEffect(() => {
    if (phase !== "success") return;
    const id = window.setTimeout(() => navigate("/login"), LOGIN_REDIRECT_MS);
    return () => window.clearTimeout(id);
  }, [phase, navigate]);

  const goLogin = () => navigate("/login");

  if (phase === "loading") {
    return (
      <VerifyEmailLayout
        cardHeadline={t("auth.verify.loadingHeadline")}
        cardSubline={t("auth.verify.loadingHint")}
        cardTone="loading"
        showSpinner
        primaryButton={null}
      />
    );
  }

  if (phase === "success") {
    return (
      <VerifyEmailLayout
        cardHeadline={t("auth.verify.successTitle")}
        cardTone="success"
        panelText={t("auth.verify.successBody")}
        primaryButton={{ label: t("auth.verify.continueToLogin"), onClick: goLogin }}
        belowPrimary={
          <p className="mt-3 text-center text-xs text-[#5a7389] sm:text-sm">
            {t("auth.register.redirectHint")}
          </p>
        }
      />
    );
  }

  return (
    <VerifyEmailLayout
      cardHeadline={t("auth.verify.errorTitle")}
      cardTone="error"
      panelText={errorDetail.trim() || t("auth.verify.invalidOrExpired")}
      primaryButton={{ label: t("auth.verify.goToLogin"), onClick: goLogin }}
    />
  );
}

export default function VerifyEmail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    const goLogin = () => navigate("/login");
    return (
      <VerifyEmailLayout
        cardHeadline={t("auth.verify.errorTitle")}
        cardTone="error"
        panelText={t("auth.verify.tokenMissing")}
        primaryButton={{ label: t("auth.verify.goToLogin"), onClick: goLogin }}
      />
    );
  }

  return <VerifyWithToken token={token} />;
}
