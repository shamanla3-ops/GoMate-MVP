import { Resend } from "resend";

const FROM = "GoMate <noreply@getgomate.com>";

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
