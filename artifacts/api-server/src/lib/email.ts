import { Resend } from "resend";

const FROM = "GoMate <noreply@getgomate.com>";

const VERIFY_BASE_URL = "https://getgomate.com/verify";

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is missing. Set it in .env (root) so the API can send email."
    );
  }
  return new Resend(key);
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

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to: trimmed,
    subject: "Verify your email",
    html: `<h1>GoMate</h1><p>Please verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  if (error) {
    throw new Error(
      typeof error.message === "string" ? error.message : "Resend rejected the email"
    );
  }
}
