import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import {
  messageFromApiError,
  type ApiErrorPayload,
} from "../lib/errorMessages";
import { useTranslation } from "../i18n";

const EXEMPT_PATHS = [
  "/terms",
  "/privacy",
  "/cookies",
  "/legal",
  "/login",
  "/register",
  "/verify",
] as const;

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

type MeResponse = { user?: { termsAccepted?: boolean } };

export function TermsAcceptanceGate() {
  const { t } = useTranslation();
  const location = useLocation();
  /** null = loading, true = accepted or logged out, false = must accept */
  const [userTermsOk, setUserTermsOk] = useState<boolean | null>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState("");

  const exempt = isExemptPath(location.pathname);

  const loadTermsStatus = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUserTermsOk(true);
      return;
    }

    if (!exempt) {
      setUserTermsOk(null);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        localStorage.removeItem("token");
        setUserTermsOk(true);
        return;
      }

      const data = (await res.json()) as MeResponse;
      const ok = data.user?.termsAccepted === true;
      setUserTermsOk(ok);
    } catch {
      setUserTermsOk(true);
    }
  }, [exempt]);

  useEffect(() => {
    void loadTermsStatus();
  }, [loadTermsStatus, location.pathname]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "token") void loadTermsStatus();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadTermsStatus]);

  useEffect(() => {
    function onAccepted() {
      setUserTermsOk(true);
    }
    window.addEventListener("gomate-terms-accepted", onAccepted);
    return () =>
      window.removeEventListener("gomate-terms-accepted", onAccepted);
  }, []);

  async function handleAccept() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setAcceptError("");
    setAcceptLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/accept-terms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        setAcceptError(
          messageFromApiError(
            data as ApiErrorPayload,
            t,
            "auth.termsGate.acceptError"
          )
        );
        return;
      }

      window.dispatchEvent(new Event("gomate-terms-accepted"));
      setUserTermsOk(true);
      await loadTermsStatus();
    } catch {
      setAcceptError(t("auth.termsGate.acceptError"));
    } finally {
      setAcceptLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUserTermsOk(true);
    window.location.href = "/login";
  }

  const tokenPresent = Boolean(localStorage.getItem("token"));
  const showLoader = Boolean(tokenPresent) && userTermsOk === null && !exempt;
  const showGate = Boolean(tokenPresent) && userTermsOk === false && !exempt;

  if (!showLoader && !showGate) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#173651]/40 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-gate-title"
      aria-describedby="terms-gate-body"
    >
      <div className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-8">
        {showLoader ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-[#35556c]">
              {t("auth.termsGate.loading")}
            </p>
          </div>
        ) : (
          <>
            <h2
              id="terms-gate-title"
              className="text-center text-2xl font-extrabold tracking-tight text-[#173651]"
            >
              {t("auth.termsGate.title")}
            </h2>
            <p
              id="terms-gate-body"
              className="mt-4 text-center text-[15px] leading-relaxed text-[#35556c]"
            >
              {t("auth.termsGate.body")}
            </p>

            <div className="mt-5 text-center">
              <Link
                to="/terms"
                className="text-sm font-bold text-[#138fe3] underline decoration-[#138fe3]/35 underline-offset-2 hover:decoration-[#138fe3]"
              >
                {t("auth.termsGate.viewTerms")}
              </Link>
            </div>

            {acceptError ? (
              <p
                className="mt-4 rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]"
                role="alert"
              >
                {acceptError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                disabled={acceptLoading}
                onClick={handleAccept}
                className="flex h-12 min-w-[10rem] flex-1 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_10px_26px_rgba(18,150,232,0.35)] transition hover:scale-[1.01] disabled:opacity-70 sm:flex-none"
              >
                {acceptLoading
                  ? t("auth.termsGate.accepting")
                  : t("auth.termsGate.accept")}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={acceptLoading}
                className="flex h-12 min-w-[10rem] flex-1 items-center justify-center rounded-full border border-[#cfe8f7] bg-white/90 px-6 text-sm font-bold text-[#28475d] shadow-sm transition hover:bg-white disabled:opacity-60 sm:flex-none"
              >
                {t("auth.termsGate.logout")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
