export type ApiErrorPayload = {
  errorCode?: string;
  error?: string;
  message?: string;
};

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>
) => string;

const UNKNOWN_KEY = "errors.UNKNOWN";

export function errorCodeToTranslationKey(errorCode: string): string {
  return `errors.${errorCode}`;
}

/**
 * Maps backend `errorCode` to `errors.<CODE>` in locale files.
 * Ignores legacy `error` / `message` strings so the UI stays localized.
 */
export function getErrorMessage(
  errorCode: string | undefined,
  t: TranslateFn,
  pageFallbackKey?: string
): string {
  const fallback = pageFallbackKey ?? UNKNOWN_KEY;
  if (!errorCode) {
    return t(fallback);
  }
  const key = errorCodeToTranslationKey(errorCode);
  const msg = t(key);
  if (msg !== key) {
    return msg;
  }
  return t(fallback);
}

export function messageFromApiError(
  data: ApiErrorPayload | null | undefined,
  t: TranslateFn,
  pageFallbackKey?: string
): string {
  return getErrorMessage(data?.errorCode, t, pageFallbackKey);
}
