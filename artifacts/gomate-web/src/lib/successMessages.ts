import type { TranslateFn } from "./errorMessages";

export type ApiSuccessPayload = {
  messageCode?: string;
  /** May be a legacy string or a structured payload (e.g. chat message); do not render directly */
  message?: unknown;
  success?: boolean;
};

export function successCodeToTranslationKey(messageCode: string): string {
  return `success.${messageCode}`;
}

/**
 * Maps backend `messageCode` to `success.<CODE>` in locale files.
 * Does not use `message` text from the API (may be non-string).
 */
export function getSuccessMessage(
  messageCode: string | undefined,
  t: TranslateFn,
  pageFallbackKey: string
): string {
  if (!messageCode) {
    return t(pageFallbackKey);
  }
  const key = successCodeToTranslationKey(messageCode);
  const msg = t(key);
  if (msg !== key) {
    return msg;
  }
  return t(pageFallbackKey);
}

export function messageFromApiSuccess(
  data: ApiSuccessPayload | null | undefined,
  t: TranslateFn,
  pageFallbackKey: string
): string {
  return getSuccessMessage(data?.messageCode, t, pageFallbackKey);
}
