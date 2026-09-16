import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

// Forgot-password flow. Kept as pure/injectable logic (no direct `db` or
// Express import) so the actual request/confirm workflows are unit
// testable without a live database, the same reasoning as
// ./metaWebhookSignature.ts — CLAUDE.md notes server/routes.ts and
// server/storage.ts have no unit coverage; this keeps the reset logic out
// of that untestable surface. server/auth/localAuth.ts wires the real
// database + Resend implementations in.

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Same minimum as /api/register and /api/auth/change-password in
// server/auth/localAuth.ts.
const MIN_PASSWORD_LENGTH = 8;

/** Generic, user-facing message for every forgot-password request outcome —
 * used unconditionally in server/auth/localAuth.ts regardless of whether
 * the email exists, so the response can never be used to enumerate accounts. */
export const FORGOT_PASSWORD_RESPONSE_MESSAGE =
  "If an account exists for this email, we have sent password reset instructions.";

// Reset requests are a rarer, higher-value action than a login attempt (and
// each one sends an email), so this is tighter than the 10/15min login
// limiter in server/auth/localAuth.ts — same limit as that file's
// super-admin-recovery endpoint in server/routes.ts. Defined here (not in
// localAuth.ts, which pulls in the live DB pool at import time) so
// server/passwordResetRateLimit.test.ts can exercise this exact middleware
// without needing a database.
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset requests. Please try again later." },
});

// Confirming a reset is already gated by an unguessable 256-bit token, but
// still rate-limited per IP against scripted probing/flooding.
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export interface GeneratedResetToken {
  /** Raw token — goes in the emailed link only, never persisted. */
  token: string;
  /** What actually gets stored in passwordResetTokenHash. */
  tokenHash: string;
  expiresAt: Date;
}

export function generateResetToken(now: Date = new Date()): GeneratedResetToken {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS),
  };
}

export function isResetTokenExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return true;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiry.getTime() <= now.getTime();
}

/** Returns a user-facing error string, or null when the new password is acceptable. */
export function validateNewPassword(newPassword: unknown, confirmPassword: unknown): string | null {
  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (newPassword !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}

/** Same bcrypt cost factor as /api/register and /api/auth/change-password. */
export async function hashNewPassword(newPassword: string): Promise<string> {
  return bcrypt.hash(newPassword, 10);
}

export interface PasswordResetUserRecord {
  id: string;
  email: string;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | string | null;
}

/** Minimal persistence surface this flow needs — implemented against the
 * real `users` table in server/auth/localAuth.ts, and against an in-memory
 * fake in server/passwordReset.test.ts. */
export interface PasswordResetStore {
  findUserByEmail(email: string): Promise<PasswordResetUserRecord | undefined>;
  findUserByResetTokenHash(tokenHash: string): Promise<PasswordResetUserRecord | undefined>;
  setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /**
   * Sets the new password hash AND consumes (clears) the reset token as one
   * atomic operation — the real implementation (server/auth/localAuth.ts)
   * wraps both writes in a single db.transaction() so a partial failure
   * (crash, dropped connection) can never leave the password changed while
   * the token that authorized it is still valid, or vice versa. Replaces
   * what used to be two separate setPasswordHash/clearResetToken calls.
   */
  setPasswordAndConsumeToken(userId: string, passwordHash: string): Promise<void>;
  /**
   * Best-effort: implementations should catch and log their own failures
   * rather than throw, since a failure revoking sessions must not undo the
   * already-committed password change above. confirmPasswordReset also
   * guards against this itself regardless of what an implementation does.
   */
  invalidateAllSessions(userId: string): Promise<void>;
}

export interface PasswordResetMailer {
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

/**
 * Issues a reset token and emails it, but ONLY when the email matches a
 * real account — and either way returns void with no signal to the caller,
 * so the HTTP layer can (and must) send the exact same response either way.
 * Never throws on an unknown email; a mailer failure for a known email is
 * left for the caller to catch/log (it must still not change the response).
 */
export async function requestPasswordReset(
  email: string,
  store: PasswordResetStore,
  mailer: PasswordResetMailer,
  now: Date = new Date(),
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return;

  const user = await store.findUserByEmail(normalizedEmail);
  if (!user) return;

  const { token, tokenHash, expiresAt } = generateResetToken(now);
  await store.setResetToken(user.id, tokenHash, expiresAt);
  await mailer.sendPasswordResetEmail(user.email, token);
}

export type ConfirmResetResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid_or_expired" | "invalid_password" };

/**
 * Validates the token + new password and, only if both are good, updates
 * the password, burns the token (single-use), and revokes every session
 * for that user. Any failure leaves the account and any existing token
 * completely untouched.
 */
export async function confirmPasswordReset(
  rawToken: unknown,
  newPassword: unknown,
  confirmPassword: unknown,
  store: PasswordResetStore,
  now: Date = new Date(),
): Promise<ConfirmResetResult> {
  const passwordError = validateNewPassword(newPassword, confirmPassword);
  if (passwordError) {
    return { ok: false, reason: "invalid_password" };
  }

  if (typeof rawToken !== "string" || !rawToken) {
    return { ok: false, reason: "invalid_or_expired" };
  }

  const tokenHash = hashResetToken(rawToken);
  const user = await store.findUserByResetTokenHash(tokenHash);
  if (!user || isResetTokenExpired(user.passwordResetExpiresAt, now)) {
    return { ok: false, reason: "invalid_or_expired" };
  }

  const passwordHash = await hashNewPassword(newPassword as string);

  // Atomic: the password change and the token consumption succeed or fail
  // together, so a second confirm request with the same token can never
  // find a still-valid token after this line, even under a partial failure.
  // A failure here IS a real failure — nothing has changed, so it's
  // correct for this to propagate and be reported to the caller as such.
  await store.setPasswordAndConsumeToken(user.id, passwordHash);

  // Best-effort: the password change above already committed and is what
  // the caller must be told succeeded — a failure revoking sessions here
  // must not turn that into a reported failure (it would falsely tell the
  // user their password change failed when it didn't).
  try {
    await store.invalidateAllSessions(user.id);
  } catch {
    // Swallowed deliberately — see comment above. The real implementation
    // in server/auth/localAuth.ts also catches and logs this itself.
  }

  return { ok: true, userId: user.id };
}
