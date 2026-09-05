import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY must be set");
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

// Resend requires a verified sending domain for anything other than their
// shared test address. Falls back to the test sender so registration still
// works before sampark.tech's domain is verified in the Resend dashboard.
const FROM_ADDRESS = process.env.EMAIL_FROM || "Sampark <onboarding@resend.dev>";

export async function sendVerificationEmail(to: string, token: string, firstName?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set - skipping verification email to", to);
    return;
  }

  const appUrl = process.env.APP_URL || "https://sampark.tech";
  const verifyUrl = `${appUrl}/api/verify-email?token=${token}`;

  const resend = getClient();
  // The Resend SDK resolves with { data, error } instead of throwing on
  // API-level failures (e.g. the sandbox sender's "own address only"
  // restriction) - without checking .error here, a failed send looked
  // identical to a successful one and the UI reported "Sent" regardless.
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Verify your Sampark account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to Sampark${firstName ? `, ${firstName}` : ""}!</h2>
        <p>Please verify your email address to activate your 7-day free trial.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Verify Email Address
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Or paste this link into your browser: ${verifyUrl}</p>
      </div>
    `,
  });
  if (error) {
    throw new Error(`Resend rejected verification email to ${to}: ${error.message}`);
  }
}
