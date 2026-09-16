import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import {
  generateResetToken,
  hashResetToken,
  isResetTokenExpired,
  validateNewPassword,
  requestPasswordReset,
  confirmPasswordReset,
  FORGOT_PASSWORD_RESPONSE_MESSAGE,
  type PasswordResetStore,
  type PasswordResetUserRecord,
} from "./passwordReset";

// In-memory stand-in for the real DB-backed store in
// server/auth/localAuth.ts, implementing the exact same
// PasswordResetStore interface the real one does.
class FakeStore implements PasswordResetStore {
  users = new Map<string, PasswordResetUserRecord & { passwordHash: string }>();
  setResetTokenCalls: Array<{ userId: string; tokenHash: string; expiresAt: Date }> = [];
  setPasswordAndConsumeTokenCalls: Array<{ userId: string; passwordHash: string }> = [];
  invalidateAllSessionsCalls: string[] = [];

  // Test-only failure injection, to exercise the atomicity/best-effort
  // guarantees confirmPasswordReset is supposed to provide regardless of
  // what the underlying store does.
  failNextSetPasswordAndConsumeToken = false;
  failNextInvalidateAllSessions = false;

  addUser(record: PasswordResetUserRecord & { passwordHash: string }) {
    this.users.set(record.id, record);
  }

  async findUserByEmail(email: string) {
    for (const u of this.users.values()) {
      if (u.email === email) return { ...u };
    }
    return undefined;
  }

  async findUserByResetTokenHash(tokenHash: string) {
    for (const u of this.users.values()) {
      if (u.passwordResetTokenHash === tokenHash) return { ...u };
    }
    return undefined;
  }

  async setResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    this.setResetTokenCalls.push({ userId, tokenHash, expiresAt });
    const u = this.users.get(userId);
    if (u) {
      u.passwordResetTokenHash = tokenHash;
      u.passwordResetExpiresAt = expiresAt;
    }
  }

  /** Mirrors the real implementation's db.transaction() in
   * server/auth/localAuth.ts: both effects happen together, or (on
   * simulated failure) neither does. */
  async setPasswordAndConsumeToken(userId: string, passwordHash: string) {
    if (this.failNextSetPasswordAndConsumeToken) {
      this.failNextSetPasswordAndConsumeToken = false;
      throw new Error("simulated transaction failure");
    }
    this.setPasswordAndConsumeTokenCalls.push({ userId, passwordHash });
    const u = this.users.get(userId);
    if (u) {
      u.passwordHash = passwordHash;
      u.passwordResetTokenHash = null;
      u.passwordResetExpiresAt = null;
    }
  }

  async invalidateAllSessions(userId: string) {
    if (this.failNextInvalidateAllSessions) {
      this.failNextInvalidateAllSessions = false;
      throw new Error("simulated session-invalidation failure");
    }
    this.invalidateAllSessionsCalls.push(userId);
  }
}

function fakeMailer() {
  return { sendPasswordResetEmail: vi.fn(async () => {}) };
}

describe("generateResetToken / hashResetToken", () => {
  it("stores only a hash - the raw token and its hash are never equal, and the hash is deterministic sha256 of the token", () => {
    const { token, tokenHash } = generateResetToken();
    expect(token).not.toBe(tokenHash);
    expect(tokenHash).toBe(hashResetToken(token));
    expect(token).toHaveLength(64); // 32 random bytes, hex
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sets a 1-hour expiry from the given time", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const { expiresAt } = generateResetToken(now);
    expect(expiresAt.getTime() - now.getTime()).toBe(60 * 60 * 1000);
  });
});

describe("isResetTokenExpired", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");
  it("treats a future expiry as not expired", () => {
    expect(isResetTokenExpired(new Date(now.getTime() + 1000), now)).toBe(false);
  });
  it("treats a past expiry as expired", () => {
    expect(isResetTokenExpired(new Date(now.getTime() - 1000), now)).toBe(true);
  });
  it("treats null/undefined as expired (fail closed)", () => {
    expect(isResetTokenExpired(null, now)).toBe(true);
    expect(isResetTokenExpired(undefined, now)).toBe(true);
  });
});

describe("validateNewPassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validateNewPassword("short1", "short1")).toMatch(/at least 8/);
  });
  it("rejects a mismatched confirmation", () => {
    expect(validateNewPassword("longenough1", "different1")).toMatch(/do not match/);
  });
  it("accepts a matching password of sufficient length", () => {
    expect(validateNewPassword("longenough1", "longenough1")).toBeNull();
  });
});

describe("requestPasswordReset", () => {
  let store: FakeStore;

  beforeEach(() => {
    store = new FakeStore();
    store.addUser({
      id: "user-1",
      email: "real@example.com",
      passwordHash: "$2a$10$existinghash",
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
  });

  it("1. issues a token and emails it for an existing email", async () => {
    const mailer = fakeMailer();
    await requestPasswordReset("real@example.com", store, mailer);

    expect(store.setResetTokenCalls).toHaveLength(1);
    expect(mailer.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [to, token] = mailer.sendPasswordResetEmail.mock.calls[0];
    expect(to).toBe("real@example.com");
    // The mailer receives the raw token (it goes in the link); the store
    // call above must have received the hash, not this same value.
    expect(store.setResetTokenCalls[0].tokenHash).not.toBe(token);
    expect(store.setResetTokenCalls[0].tokenHash).toBe(hashResetToken(token));
  });

  it("2. does nothing (no token, no email) for a non-existing email, with no observable difference from the caller's perspective", async () => {
    const mailer = fakeMailer();
    await expect(requestPasswordReset("nobody@example.com", store, mailer)).resolves.toBeUndefined();

    expect(store.setResetTokenCalls).toHaveLength(0);
    expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("is case-insensitive on email lookup, same as login/register", async () => {
    const mailer = fakeMailer();
    await requestPasswordReset("REAL@EXAMPLE.COM", store, mailer);
    expect(store.setResetTokenCalls).toHaveLength(1);
  });

  // The HTTP layer (server/auth/localAuth.ts) always responds with this
  // exact fixed string regardless of what happened above - asserting the
  // constant exists and reads as generic guards against that route ever
  // being changed to leak a different message per branch.
  it("the fixed response message never reveals whether the account exists", () => {
    expect(FORGOT_PASSWORD_RESPONSE_MESSAGE).toBe(
      "If an account exists for this email, we have sent password reset instructions.",
    );
  });
});

describe("confirmPasswordReset", () => {
  let store: FakeStore;
  const now = new Date("2026-01-01T00:00:00.000Z");

  beforeEach(async () => {
    store = new FakeStore();
    store.addUser({
      id: "user-1",
      email: "real@example.com",
      passwordHash: "$2a$10$oldhash",
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
  });

  async function issueToken(issuedAt = now) {
    const mailer = fakeMailer();
    await requestPasswordReset("real@example.com", store, mailer, issuedAt);
    const [, token] = mailer.sendPasswordResetEmail.mock.calls[0];
    return token as string;
  }

  it("4. a valid, unexpired token allows the reset and updates the password with a real bcrypt hash", async () => {
    const token = await issueToken();
    const result = await confirmPasswordReset(token, "newpassword1", "newpassword1", store, now);

    expect(result.ok).toBe(true);
    expect(store.setPasswordAndConsumeTokenCalls).toHaveLength(1);
    const storedHash = store.setPasswordAndConsumeTokenCalls[0].passwordHash;

    // 9. Password is stored using the same bcrypt hashing as the rest of
    // the app (server/auth/localAuth.ts's register/change-password use
    // bcrypt.hash(password, 10) too) - not reversible, not the raw value.
    expect(storedHash).not.toBe("newpassword1");
    expect(storedHash.startsWith("$2")).toBe(true); // bcryptjs hash identifier
    await expect(bcrypt.compare("newpassword1", storedHash)).resolves.toBe(true);

    // 8. Session security: every existing session for the account is revoked.
    expect(store.invalidateAllSessionsCalls).toEqual(["user-1"]);
  });

  it("5. an invalid/unknown token is rejected and nothing is changed", async () => {
    const result = await confirmPasswordReset("not-a-real-token", "newpassword1", "newpassword1", store, now);
    expect(result).toEqual({ ok: false, reason: "invalid_or_expired" });
    expect(store.setPasswordAndConsumeTokenCalls).toHaveLength(0);
    expect(store.invalidateAllSessionsCalls).toHaveLength(0);
  });

  it("6. an expired token is rejected even though it otherwise matches", async () => {
    const token = await issueToken(now);
    const oneHourAndOneMinuteLater = new Date(now.getTime() + 61 * 60 * 1000);
    const result = await confirmPasswordReset(token, "newpassword1", "newpassword1", store, oneHourAndOneMinuteLater);
    expect(result).toEqual({ ok: false, reason: "invalid_or_expired" });
    expect(store.setPasswordAndConsumeTokenCalls).toHaveLength(0);
  });

  it("7. a token cannot be reused after a successful reset", async () => {
    const token = await issueToken();
    const first = await confirmPasswordReset(token, "newpassword1", "newpassword1", store, now);
    expect(first.ok).toBe(true);

    const second = await confirmPasswordReset(token, "anotherpassword2", "anotherpassword2", store, now);
    expect(second).toEqual({ ok: false, reason: "invalid_or_expired" });
    // Still only the one password change from the first, successful attempt.
    expect(store.setPasswordAndConsumeTokenCalls).toHaveLength(1);
  });

  it("8. a password/confirmation mismatch is rejected before ever touching the store", async () => {
    const token = await issueToken();
    const result = await confirmPasswordReset(token, "newpassword1", "somethingelse2", store, now);
    expect(result).toEqual({ ok: false, reason: "invalid_password" });
    expect(store.setPasswordAndConsumeTokenCalls).toHaveLength(0);
  });

  it("rejects a too-short new password even with a valid token", async () => {
    const token = await issueToken();
    const result = await confirmPasswordReset(token, "short1", "short1", store, now);
    expect(result).toEqual({ ok: false, reason: "invalid_password" });
  });

  it("atomicity: a failure in the password+token write is a real, surfaced failure (nothing partially applied)", async () => {
    const token = await issueToken();
    store.failNextSetPasswordAndConsumeToken = true;

    await expect(confirmPasswordReset(token, "newpassword1", "newpassword1", store, now)).rejects.toThrow(
      "simulated transaction failure",
    );

    // Nothing committed — no password change, no session revocation, and
    // (unlike a real DB transaction that would roll back) this fake proves
    // the same contract: the token is untouched, so the same token can
    // still be tried again.
    expect(store.setPasswordAndConsumeTokenCalls).toHaveLength(0);
    expect(store.invalidateAllSessionsCalls).toHaveLength(0);
    const user = store.users.get("user-1")!;
    expect(user.passwordResetTokenHash).toBe(hashResetToken(token));

    const retry = await confirmPasswordReset(token, "newpassword1", "newpassword1", store, now);
    expect(retry.ok).toBe(true);
  });

  it("best-effort session revocation: a failure invalidating sessions does NOT turn an already-successful password change into a reported failure", async () => {
    const token = await issueToken();
    store.failNextInvalidateAllSessions = true;

    const result = await confirmPasswordReset(token, "newpassword1", "newpassword1", store, now);

    // The client must see success — the password really did change.
    expect(result).toEqual({ ok: true, userId: "user-1" });
    expect(store.setPasswordAndConsumeTokenCalls).toHaveLength(1);
    const storedHash = store.setPasswordAndConsumeTokenCalls[0].passwordHash;
    await expect(bcrypt.compare("newpassword1", storedHash)).resolves.toBe(true);

    // The token is still burned (part of the same atomic write as the
    // password change, not dependent on session revocation succeeding).
    const user = store.users.get("user-1")!;
    expect(user.passwordResetTokenHash).toBeNull();

    // The reused token can't work a second time either way.
    const second = await confirmPasswordReset(token, "anotherpassword2", "anotherpassword2", store, now);
    expect(second).toEqual({ ok: false, reason: "invalid_or_expired" });
  });
});
