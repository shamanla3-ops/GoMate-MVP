import { Resend } from "resend";

const FROM = "GoMate <noreply@getgomate.com>";

const VERIFY_BASE_URL = "https://getgomate.com/verify";

const APP_BASE_URL = "https://getgomate.com";

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif';

const COLORS = {
  pageBg: "#eef4f8",
  cardBg: "#ffffff",
  textPrimary: "#173651",
  textBody: "#35556c",
  textMuted: "#5a7389",
  blue: "#1296e8",
  green: "#8ada33",
  border: "#e3edf5",
  footerNote: "#6b7785",
  headerMuted: "#4a6678",
} as const;

const DISPLAY_NAME_MAX_LEN = 80;

const ROUTE_FIELD_MAX_LEN = 255;

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is missing. Set it in .env (root) so the API can send email."
    );
  }
  return new Resend(key);
}

function sanitizeDisplayName(name?: string): string | undefined {
  if (typeof name !== "string") return undefined;
  const t = name.trim().replace(/\s+/g, " ");
  if (t === "") return undefined;
  return t.length > DISPLAY_NAME_MAX_LEN
    ? t.slice(0, DISPLAY_NAME_MAX_LEN).trimEnd()
    : t;
}

function sanitizeRouteField(value: string): string {
  const t = value.trim().replace(/\s+/g, " ");
  if (t.length <= ROUTE_FIELD_MAX_LEN) return t;
  return `${t.slice(0, ROUTE_FIELD_MAX_LEN - 1).trimEnd()}…`;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildGreetingHtml(displayName?: string): string {
  if (displayName) {
    return `Hi ${escapeHtml(displayName)},`;
  }
  return "Hello,";
}

function buildGreetingText(displayName?: string): string {
  if (displayName) {
    return `Hi ${displayName},`;
  }
  return "Hello,";
}

function formatDepartureForEmail(value?: string | Date): string | undefined {
  if (value === undefined || value === null) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString("en-GB", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (typeof value === "string") {
    const s = value.trim();
    return s === "" ? undefined : s;
  }
  return undefined;
}

function buildVerificationEmailHtml(
  verifyUrl: string,
  displayName?: string
): string {
  const preheader = "Confirm your email to activate your GoMate account";
  const greeting = buildGreetingHtml(displayName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.pageBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLORS.pageBg};opacity:0;">
${preheader}
&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.pageBg};margin:0;padding:0;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:36px 16px 48px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 20px 0;text-align:center;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 10px 0;text-align:center;">
                  <p style="margin:0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.headerMuted};">
                    GoMate
                  </p>
                </td>
              </tr>
              <tr>
                <td style="text-align:center;">
                  <p style="margin:0;font-family:${FONT};font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;color:${COLORS.textPrimary};">
                    <span style="color:${COLORS.blue};">Go</span><span style="color:${COLORS.textPrimary};">Mate</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0 0 0;text-align:center;">
                  <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.45;color:${COLORS.textMuted};">
                    Smarter shared rides
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:16px 0 0 0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="border-collapse:collapse;">
                    <tr>
                      <td width="56" style="width:56px;height:3px;line-height:3px;font-size:0;background-color:${COLORS.blue};background-image:linear-gradient(90deg,${COLORS.blue} 0%,${COLORS.green} 100%);border-radius:999px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:${COLORS.cardBg};border-radius:16px;border:1px solid ${COLORS.border};box-shadow:0 12px 40px rgba(23,54,81,0.08);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="height:4px;background-color:${COLORS.blue};background-image:linear-gradient(90deg,${COLORS.blue} 0%,${COLORS.green} 100%);line-height:4px;font-size:0;border-radius:16px 16px 0 0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:36px 28px 32px 28px;font-family:${FONT};">
                  <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${COLORS.textPrimary};">
                    Verify your email
                  </h1>
                  <p style="margin:0 0 18px 0;font-size:17px;line-height:1.45;font-weight:600;color:${COLORS.textPrimary};">
                    ${greeting}
                  </p>
                  <p style="margin:0 0 26px 0;font-size:16px;line-height:1.65;color:${COLORS.textBody};">
                    Thanks for joining GoMate. Please confirm your email address to activate your account.
                  </p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px auto;border-collapse:collapse;">
                    <tr>
                      <td align="center" style="border-radius:999px;background-color:${COLORS.blue};background-image:linear-gradient(90deg,${COLORS.blue} 0%,#6bc72a 100%);">
                        <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 36px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:0.01em;">
                          Verify email
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:${COLORS.textMuted};">
                    If the button does not work, copy and open this link:
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.55;color:${COLORS.blue};word-break:break-all;">
                    <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="color:${COLORS.blue};text-decoration:underline;">${verifyUrl}</a>
                  </p>
                  <p style="margin:28px 0 0 0;padding-top:24px;border-top:1px solid ${COLORS.border};font-size:13px;line-height:1.55;color:${COLORS.footerNote};">
                    If you did not create a GoMate account, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 12px 0 12px;text-align:center;">
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.55;color:${COLORS.footerNote};">
              <a href="${APP_BASE_URL}" style="color:${COLORS.textMuted};text-decoration:none;font-weight:600;">getgomate.com</a>
              <span style="color:${COLORS.border};">&nbsp;·&nbsp;</span>
              <span style="color:${COLORS.footerNote};">GoMate</span>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function buildVerificationEmailText(
  verifyUrl: string,
  displayName?: string
): string {
  const greeting = buildGreetingText(displayName);
  return [
    "Verify your email",
    "",
    greeting,
    "",
    "Thanks for joining GoMate. Please confirm your email address to activate your account.",
    "",
    "Verify your email (open this link):",
    verifyUrl,
    "",
    "If you did not create a GoMate account, you can safely ignore this email.",
    "",
    "— GoMate",
    APP_BASE_URL,
  ].join("\n");
}

export type SendTripRequestEmailParams = {
  driverEmail: string;
  driverName?: string;
  passengerName?: string;
  origin: string;
  destination: string;
  departureTime?: string | Date;
  tripId?: string;
};

function buildTripRequestEmailHtml(params: {
  greetingHtml: string;
  passengerLineHtml: string;
  originSafe: string;
  destinationSafe: string;
  departureLine?: string;
  tripIdLine?: string;
}): string {
  const preheader =
    "A passenger requested a seat on your trip — review it in GoMate.";
  const depBlock = params.departureLine
    ? `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:${COLORS.textBody};">
                    <strong style="color:${COLORS.textPrimary};">Departure:</strong> ${escapeHtml(params.departureLine)}
                  </p>`
    : "";
  const tripIdBlock = params.tripIdLine
    ? `<p style="margin:0 0 20px 0;font-size:12px;line-height:1.5;color:${COLORS.textMuted};">
                    Trip ID: ${escapeHtml(params.tripIdLine)}
                  </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>New trip request on GoMate</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.pageBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLORS.pageBg};opacity:0;">
${preheader}
&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.pageBg};margin:0;padding:0;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:32px 16px 44px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 16px 0;text-align:center;">
            <p style="margin:0;font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;color:${COLORS.textPrimary};">
              <span style="color:${COLORS.blue};">Go</span><span style="color:${COLORS.textPrimary};">Mate</span>
            </p>
            <p style="margin:6px 0 0 0;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.headerMuted};">
              Driver update
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:${COLORS.cardBg};border-radius:14px;border:1px solid ${COLORS.border};box-shadow:0 10px 32px rgba(23,54,81,0.07);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="height:3px;background-image:linear-gradient(90deg,${COLORS.blue} 0%,${COLORS.green} 100%);line-height:3px;font-size:0;border-radius:14px 14px 0 0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:28px 24px 26px 24px;font-family:${FONT};">
                  <h1 style="margin:0 0 14px 0;font-size:21px;line-height:1.3;font-weight:800;color:${COLORS.textPrimary};">
                    New trip request
                  </h1>
                  <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;font-weight:600;color:${COLORS.textPrimary};">
                    ${params.greetingHtml}
                  </p>
                  <p style="margin:0 0 18px 0;font-size:16px;line-height:1.65;color:${COLORS.textBody};">
                    ${params.passengerLineHtml}
                  </p>
                  <p style="margin:0 0 10px 0;font-size:15px;line-height:1.55;color:${COLORS.textBody};">
                    <strong style="color:${COLORS.textPrimary};">Route:</strong>
                    ${params.originSafe} → ${params.destinationSafe}
                  </p>
                  ${depBlock}
                  ${tripIdBlock}
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 0 auto;border-collapse:collapse;">
                    <tr>
                      <td align="center" style="border-radius:999px;background-color:${COLORS.blue};background-image:linear-gradient(90deg,${COLORS.blue} 0%,#6bc72a 100%);">
                        <a href="${APP_BASE_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                          Open GoMate
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:22px 0 0 0;padding-top:20px;border-top:1px solid ${COLORS.border};font-size:12px;line-height:1.55;color:${COLORS.footerNote};">
                    Open GoMate to review and respond to this request in your dashboard.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 8px 0 8px;text-align:center;">
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${COLORS.footerNote};">
              <a href="${APP_BASE_URL}" style="color:${COLORS.textMuted};text-decoration:none;font-weight:600;">getgomate.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function buildTripRequestEmailText(params: {
  greetingText: string;
  passengerLineText: string;
  origin: string;
  destination: string;
  departureLine?: string;
  tripId?: string;
}): string {
  const lines = [
    "New trip request on GoMate",
    "",
    params.greetingText,
    "",
    params.passengerLineText,
    "",
    `Route: ${params.origin} → ${params.destination}`,
  ];
  if (params.departureLine) {
    lines.push(`Departure: ${params.departureLine}`);
  }
  if (params.tripId) {
    lines.push(`Trip ID: ${params.tripId}`);
  }
  lines.push(
    "",
    "Open GoMate:",
    APP_BASE_URL,
    "",
    "— GoMate"
  );
  return lines.join("\n");
}

export async function sendTestEmail(to: string): Promise<void> {
  const trimmed = to.trim();
  if (!trimmed) {
    throw new Error("sendTestEmail: recipient address is empty");
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to: trimmed,
    subject: "GoMate test email",
    html: "<h1>GoMate</h1><p>Email sending works.</p>",
  });

  if (error) {
    throw new Error(
      typeof error.message === "string" ? error.message : "Resend rejected the email"
    );
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string
): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("sendVerificationEmail: recipient address is empty");
  }

  const displayName = sanitizeDisplayName(name);
  const safeToken = encodeURIComponent(token);
  const verifyUrl = `${VERIFY_BASE_URL}?token=${safeToken}`;

  const html = buildVerificationEmailHtml(verifyUrl, displayName);
  const text = buildVerificationEmailText(verifyUrl, displayName);

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to: trimmed,
    subject: "Verify your email",
    html,
    text,
  });

  if (error) {
    throw new Error(
      typeof error.message === "string" ? error.message : "Resend rejected the email"
    );
  }
}

export async function sendTripRequestEmail(
  params: SendTripRequestEmailParams
): Promise<void> {
  const to = params.driverEmail.trim();
  if (!to) {
    throw new Error("sendTripRequestEmail: driver email is empty");
  }

  const driverDisplay = sanitizeDisplayName(params.driverName);
  const passengerDisplay = sanitizeDisplayName(params.passengerName);
  const origin = sanitizeRouteField(params.origin);
  const destination = sanitizeRouteField(params.destination);
  const departureLine = formatDepartureForEmail(params.departureTime);
  const tripIdLine =
    typeof params.tripId === "string" && params.tripId.trim() !== ""
      ? params.tripId.trim()
      : undefined;

  const greetingHtml = buildGreetingHtml(driverDisplay);
  const greetingText = buildGreetingText(driverDisplay);

  const passengerLineHtml = passengerDisplay
    ? `<strong style="color:${COLORS.textPrimary};">${escapeHtml(passengerDisplay)}</strong> requested a seat on your trip.`
    : "A passenger requested a seat on your trip.";

  const passengerLineText = passengerDisplay
    ? `${passengerDisplay} requested a seat on your trip.`
    : "A passenger requested a seat on your trip.";

  const originSafe = escapeHtml(origin);
  const destinationSafe = escapeHtml(destination);

  const html = buildTripRequestEmailHtml({
    greetingHtml,
    passengerLineHtml,
    originSafe,
    destinationSafe,
    departureLine,
    tripIdLine,
  });

  const text = buildTripRequestEmailText({
    greetingText,
    passengerLineText,
    origin,
    destination,
    departureLine,
    tripId: tripIdLine,
  });

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "New trip request on GoMate",
    html,
    text,
  });

  if (error) {
    throw new Error(
      typeof error.message === "string" ? error.message : "Resend rejected the email"
    );
  }
}

export type SendTripRequestAcceptedEmailParams = {
  passengerEmail: string;
  passengerName?: string;
  driverName?: string;
  origin: string;
  destination: string;
  departureTime?: string | Date;
  tripId?: string;
};

function buildTripRequestAcceptedEmailHtml(params: {
  greetingHtml: string;
  leadHtml: string;
  originSafe: string;
  destinationSafe: string;
  departureLine?: string;
  tripIdLine?: string;
}): string {
  const preheader =
    "Your driver accepted your request — open GoMate for trip details.";
  const depBlock = params.departureLine
    ? `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:${COLORS.textBody};">
                    <strong style="color:${COLORS.textPrimary};">Departure:</strong> ${escapeHtml(params.departureLine)}
                  </p>`
    : "";
  const tripIdBlock = params.tripIdLine
    ? `<p style="margin:0 0 20px 0;font-size:12px;line-height:1.5;color:${COLORS.textMuted};">
                    Trip ID: ${escapeHtml(params.tripIdLine)}
                  </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Your GoMate trip request was accepted</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.pageBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLORS.pageBg};opacity:0;">
${preheader}
&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.pageBg};margin:0;padding:0;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:32px 16px 44px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 16px 0;text-align:center;">
            <p style="margin:0;font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;color:${COLORS.textPrimary};">
              <span style="color:${COLORS.blue};">Go</span><span style="color:${COLORS.textPrimary};">Mate</span>
            </p>
            <p style="margin:6px 0 0 0;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.headerMuted};">
              Trip confirmed
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:${COLORS.cardBg};border-radius:14px;border:1px solid ${COLORS.border};box-shadow:0 10px 32px rgba(23,54,81,0.07);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="height:3px;background-image:linear-gradient(90deg,${COLORS.blue} 0%,${COLORS.green} 100%);line-height:3px;font-size:0;border-radius:14px 14px 0 0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:28px 24px 26px 24px;font-family:${FONT};">
                  <h1 style="margin:0 0 14px 0;font-size:21px;line-height:1.3;font-weight:800;color:${COLORS.textPrimary};">
                    Your request was accepted
                  </h1>
                  <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;font-weight:600;color:${COLORS.textPrimary};">
                    ${params.greetingHtml}
                  </p>
                  <p style="margin:0 0 18px 0;font-size:16px;line-height:1.65;color:${COLORS.textBody};">
                    ${params.leadHtml}
                  </p>
                  <p style="margin:0 0 10px 0;font-size:15px;line-height:1.55;color:${COLORS.textBody};">
                    <strong style="color:${COLORS.textPrimary};">Route:</strong>
                    ${params.originSafe} → ${params.destinationSafe}
                  </p>
                  ${depBlock}
                  ${tripIdBlock}
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 0 auto;border-collapse:collapse;">
                    <tr>
                      <td align="center" style="border-radius:999px;background-color:${COLORS.blue};background-image:linear-gradient(90deg,${COLORS.blue} 0%,#6bc72a 100%);">
                        <a href="${APP_BASE_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                          Open GoMate
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:22px 0 0 0;padding-top:20px;border-top:1px solid ${COLORS.border};font-size:12px;line-height:1.55;color:${COLORS.footerNote};">
                    Open GoMate anytime to view trip details and message your driver.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 8px 0 8px;text-align:center;">
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${COLORS.footerNote};">
              <a href="${APP_BASE_URL}" style="color:${COLORS.textMuted};text-decoration:none;font-weight:600;">getgomate.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function buildTripRequestAcceptedEmailText(params: {
  greetingText: string;
  leadText: string;
  origin: string;
  destination: string;
  departureLine?: string;
  tripId?: string;
}): string {
  const lines = [
    "Your GoMate trip request was accepted",
    "",
    params.greetingText,
    "",
    params.leadText,
    "",
    `Route: ${params.origin} → ${params.destination}`,
  ];
  if (params.departureLine) {
    lines.push(`Departure: ${params.departureLine}`);
  }
  if (params.tripId) {
    lines.push(`Trip ID: ${params.tripId}`);
  }
  lines.push(
    "",
    "Open GoMate:",
    APP_BASE_URL,
    "",
    "— GoMate"
  );
  return lines.join("\n");
}

export async function sendTripRequestAcceptedEmail(
  params: SendTripRequestAcceptedEmailParams
): Promise<void> {
  const to = params.passengerEmail.trim();
  if (!to) {
    throw new Error("sendTripRequestAcceptedEmail: passenger email is empty");
  }

  const passengerDisplay = sanitizeDisplayName(params.passengerName);
  const driverDisplay = sanitizeDisplayName(params.driverName);
  const origin = sanitizeRouteField(params.origin);
  const destination = sanitizeRouteField(params.destination);
  const departureLine = formatDepartureForEmail(params.departureTime);
  const tripIdLine =
    typeof params.tripId === "string" && params.tripId.trim() !== ""
      ? params.tripId.trim()
      : undefined;

  const greetingHtml = buildGreetingHtml(passengerDisplay);
  const greetingText = buildGreetingText(passengerDisplay);

  const leadHtml = driverDisplay
    ? `Great news — <strong style="color:${COLORS.textPrimary};">${escapeHtml(driverDisplay)}</strong> accepted your trip request. You're confirmed for this ride.`
    : `Great news — your trip request was accepted. You're confirmed for this ride.`;

  const leadText = driverDisplay
    ? `Great news — ${driverDisplay} accepted your trip request. You're confirmed for this ride.`
    : `Great news — your trip request was accepted. You're confirmed for this ride.`;

  const originSafe = escapeHtml(origin);
  const destinationSafe = escapeHtml(destination);

  const html = buildTripRequestAcceptedEmailHtml({
    greetingHtml,
    leadHtml,
    originSafe,
    destinationSafe,
    departureLine,
    tripIdLine,
  });

  const text = buildTripRequestAcceptedEmailText({
    greetingText,
    leadText,
    origin,
    destination,
    departureLine,
    tripId: tripIdLine,
  });

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Your GoMate trip request was accepted",
    html,
    text,
  });

  if (error) {
    throw new Error(
      typeof error.message === "string" ? error.message : "Resend rejected the email"
    );
  }
}
