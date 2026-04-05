import { Resend } from "resend";

const FROM = "GoMate <noreply@getgomate.com>";

const VERIFY_BASE_URL = "https://getgomate.com/verify";

const FONT =
  "Arial, Helvetica, sans-serif";

const COLORS = {
  pageBg: "#f0f4f8",
  cardBg: "#ffffff",
  textPrimary: "#1a1a1a",
  textBody: "#3d4f5f",
  textMuted: "#5c6c7a",
  blue: "#0f7dd4",
  green: "#3d9c2a",
  border: "#e8edf2",
  footerNote: "#6b7785",
} as const;

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is missing. Set it in .env (root) so the API can send email."
    );
  }
  return new Resend(key);
}

function buildVerificationEmailHtml(verifyUrl: string): string {
  const preheader = "Confirm your email to activate your GoMate account";

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
&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.pageBg};margin:0;padding:0;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:40px 16px 48px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 24px 0;text-align:center;">
            <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:700;letter-spacing:0.02em;color:${COLORS.textPrimary};">
              GoMate
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:${COLORS.cardBg};border-radius:12px;border:1px solid ${COLORS.border};box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="height:3px;background-color:${COLORS.blue};background-image:linear-gradient(90deg,${COLORS.blue} 0%,${COLORS.green} 100%);line-height:3px;font-size:0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:40px 36px 36px 36px;font-family:${FONT};">
                  <h1 style="margin:0 0 20px 0;font-size:22px;line-height:1.3;font-weight:700;color:${COLORS.textPrimary};">
                    Verify your email
                  </h1>
                  <p style="margin:0 0 28px 0;font-size:16px;line-height:1.6;color:${COLORS.textBody};">
                    Thanks for joining GoMate.<br /><br />
                    Please confirm your email address to activate your account.
                  </p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 32px auto;border-collapse:collapse;">
                    <tr>
                      <td align="center" bgcolor="${COLORS.blue}" style="border-radius:6px;background-color:${COLORS.blue};">
                        <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 40px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">
                          Verify email
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 10px 0;font-size:14px;line-height:1.5;color:${COLORS.textMuted};">
                    If the button does not work, copy and open this link:
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.55;color:${COLORS.blue};word-break:break-all;">
                    <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="color:${COLORS.blue};text-decoration:underline;">${verifyUrl}</a>
                  </p>
                  <p style="margin:32px 0 0 0;padding-top:28px;border-top:1px solid ${COLORS.border};font-size:13px;line-height:1.55;color:${COLORS.footerNote};">
                    If you did not create a GoMate account, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 8px 0 8px;text-align:center;">
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${COLORS.footerNote};">
              <a href="https://getgomate.com" style="color:${COLORS.textMuted};text-decoration:none;">getgomate.com</a>
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

function buildVerificationEmailText(verifyUrl: string): string {
  return [
    "Verify your email",
    "",
    "Thanks for joining GoMate. Please confirm your email address to activate your account.",
    "",
    "If the button does not work, copy and open this link:",
    verifyUrl,
    "",
    "If you did not create a GoMate account, you can safely ignore this email.",
  ].join("\n");
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
  token: string
): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("sendVerificationEmail: recipient address is empty");
  }

  const safeToken = encodeURIComponent(token);
  const verifyUrl = `${VERIFY_BASE_URL}?token=${safeToken}`;

  const html = buildVerificationEmailHtml(verifyUrl);
  const text = buildVerificationEmailText(verifyUrl);

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
