import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import type { Express, RequestHandler } from "express";
import { db } from "@db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { authStorage } from "./storage";
import { getSession } from "./session";
import { sendVerificationEmail, sendPasswordResetEmail } from "../email";
import {
  activateUserSession,
  clearActiveSessionIfMatch,
  getActiveSessionId,
  invalidateAllUserSessions,
} from "./singleSession";
import { TRIAL_DAYS } from "../trialLimits";
import { blockExpiredTrialWrites } from "../subscriptionGate";
import { ensureCsrfToken, verifyCsrf } from "../csrf";
import {
  requestPasswordReset,
  confirmPasswordReset,
  FORGOT_PASSWORD_RESPONSE_MESSAGE,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  shouldAuditPasswordReset,
  type PasswordResetStore,
  type PasswordResetMailer,
} from "../passwordReset";

// 10 attempts per 15 minutes per IP — generous enough for a real user who
// mistypes a password a few times, tight enough to slow down brute-forcing.
// In-memory store (fine for a single Render instance today); if this app
// ever scales to multiple instances, swap in a Redis-backed store (the
// REDIS_URL already used for BullMQ could be reused) so limits are shared.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in a few minutes." },
});

interface SessionUser {
  claims: {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
}

function toSessionUser(user: typeof users.$inferSelect): SessionUser {
  return {
    claims: {
      sub: user.id,
      email: user.email ?? undefined,
      first_name: user.firstName ?? undefined,
      last_name: user.lastName ?? undefined,
      profile_image_url: user.profileImageUrl ?? undefined,
    },
  };
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(blockExpiredTrialWrites);

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email: string, password: string, done) => {
        try {
          const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
          if (!user || !user.passwordHash) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          return done(null, toSessionUser(user) as Express.User);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body || {};
      if (!email || !password || String(password).length < 8) {
        return res.status(400).json({
          message: "Email and a password of at least 8 characters are required",
        });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
      const [user] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          subscriptionStatus: "trial",
          trialEndsAt,
          emailVerificationToken,
        })
        .returning();

      sendVerificationEmail(normalizedEmail, emailVerificationToken, firstName).catch((err) => {
        console.error("Failed to send verification email:", err);
      });

      req.login(toSessionUser(user) as Express.User, async (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res.status(500).json({ message: "Registered, but failed to start session" });
        }
        try {
          await activateUserSession(user.id, req.sessionID);
        } catch (e) {
          console.error("Failed to activate session after registration:", e);
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/login", loginRateLimiter, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message?: string }) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Failed to log in" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Incorrect email or password" });
      }
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error("Session start error:", loginErr);
          return res.status(500).json({ message: "Failed to start session" });
        }
        // Return the user payload so the client can hydrate auth state without
        // a second Neon round-trip to GET /api/auth/user.
        try {
          const userId = (user as SessionUser).claims.sub;
          await activateUserSession(userId, req.sessionID);
          const fullUser = await authStorage.getUser(userId);
          // Only admin/super_admin logins go into the audit log - logging
          // every regular customer login would flood it with noise the log
          // was never meant to hold (see server/auth/storage.ts).
          if (fullUser && (fullUser.role === "admin" || fullUser.role === "super_admin")) {
            authStorage
              .addAuditLogEntry({
                actorUserId: fullUser.id,
                actorLabel: fullUser.email || fullUser.id,
                action: "admin_login",
                description: `${fullUser.email || fullUser.id} logged in`,
              })
              .catch((e) => console.error("Audit log (login) error:", e));
          }
          return res.json({ success: true, user: fullUser || null });
        } catch (e) {
          console.error("Login user hydrate error:", e);
          return res.json({ success: true, user: null });
        }
      });
    })(req, res, next);
  });

  // Fetches (creating if needed) the CSRF token bound to the current
  // session - see server/csrf.ts. Safe to call whether or not the caller
  // is logged in; used by the admin panel before its first mutating request.
  app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: ensureCsrfToken(req) });
  });

  app.post("/api/auth/change-password", isAuthenticated, verifyCsrf, async (req: any, res) => {
    try {
      const userId = (req.user as SessionUser).claims.sub;
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword || String(newPassword).length < 8) {
        return res.status(400).json({
          message: "Current password and a new password of at least 8 characters are required",
        });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: "User not found" });
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
        .where(eq(users.id, userId));

      if (user.role === "admin" || user.role === "super_admin") {
        authStorage
          .addAuditLogEntry({
            actorUserId: user.id,
            actorLabel: user.email || user.id,
            action: "password_change",
            description: `${user.email || user.id} changed their password`,
          })
          .catch((e) => console.error("Audit log (password change) error:", e));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Real DB-backed implementation of the injectable interfaces
  // server/passwordReset.ts defines — see that file for the actual
  // request/confirm logic and server/passwordReset.test.ts for its
  // coverage using a fake in-memory version of this same interface.
  const resetStore: PasswordResetStore = {
    async findUserByEmail(email) {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user?.email
        ? {
            id: user.id,
            email: user.email,
            passwordResetTokenHash: user.passwordResetTokenHash,
            passwordResetExpiresAt: user.passwordResetExpiresAt,
          }
        : undefined;
    },
    async findUserByResetTokenHash(tokenHash) {
      const [user] = await db.select().from(users).where(eq(users.passwordResetTokenHash, tokenHash));
      return user?.email
        ? {
            id: user.id,
            email: user.email,
            passwordResetTokenHash: user.passwordResetTokenHash,
            passwordResetExpiresAt: user.passwordResetExpiresAt,
          }
        : undefined;
    },
    async setResetToken(userId, tokenHash, expiresAt) {
      await db
        .update(users)
        .set({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },
    async setPasswordAndConsumeToken(userId, passwordHash) {
      // Both writes commit together or not at all — a crash/dropped
      // connection between them can never leave the password changed with
      // the reset token still valid (or the token cleared with the old
      // password still active). See PasswordResetStore's doc comment.
      await db.transaction(async (tx) => {
        await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
        await tx
          .update(users)
          .set({ passwordResetTokenHash: null, passwordResetExpiresAt: null, updatedAt: new Date() })
          .where(eq(users.id, userId));
      });
    },
    async invalidateAllSessions(userId) {
      // Best-effort by contract (see PasswordResetStore) — never throws,
      // so a session-revocation failure can't undo the password change
      // that already committed above. Still logged: every caught error
      // here is a real bug worth fixing at the source.
      try {
        await invalidateAllUserSessions(userId);
      } catch (error) {
        console.error("Failed to invalidate sessions after password reset:", error);
      }
    },
  };

  const resetMailer: PasswordResetMailer = { sendPasswordResetEmail };

  app.post("/api/forgot-password", forgotPasswordRateLimiter, (req, res) => {
    const { email } = req.body || {};
    // Fire-and-forget, same pattern as /api/register's sendVerificationEmail
    // above — requestPasswordReset does a real DB write plus a network call
    // to Resend for an existing email, but nothing at all for an unknown
    // one. Awaiting it before responding would make the response
    // measurably slower for a real account than a fake one, which is
    // exactly the enumeration signal the identical response body below is
    // meant to prevent. The token itself never reaches this log line
    // (requestPasswordReset only ever throws from the mailer/DB, not the
    // token generation path).
    if (typeof email === "string" && email.trim()) {
      requestPasswordReset(email, resetStore, resetMailer).catch((error) => {
        console.error("Forgot-password error:", error);
      });
    }
    // Identical response on every path, sent without waiting on the above —
    // unknown email, in-flight send, eventual send failure, or success —
    // so this endpoint can't be used to enumerate registered accounts by
    // response body or response timing. See
    // server/passwordReset.ts's FORGOT_PASSWORD_RESPONSE_MESSAGE.
    res.json({ message: FORGOT_PASSWORD_RESPONSE_MESSAGE });
  });

  app.post("/api/reset-password", resetPasswordRateLimiter, async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body || {};
      const result = await confirmPasswordReset(token, newPassword, confirmPassword, resetStore);
      if (!result.ok) {
        const message =
          result.reason === "invalid_password"
            ? "Passwords must match and be at least 8 characters"
            : "This reset link is invalid or has expired. Please request a new one.";
        return res.status(400).json({ message });
      }

      // Audit log for admin/super_admin accounts only, mirroring
      // /api/auth/change-password above — only after the reset itself has
      // already succeeded, and never including the token or password/hash.
      // Fire-and-forget: a failure looking up the role or writing the
      // entry must not turn an already-successful password reset into a
      // reported failure (same reasoning as confirmPasswordReset's own
      // best-effort session invalidation).
      authStorage
        .getUser(result.userId)
        .then((user) => {
          if (user && shouldAuditPasswordReset(user.role)) {
            return authStorage.addAuditLogEntry({
              actorUserId: user.id,
              actorLabel: user.email || user.id,
              action: "password_reset",
              description: `${user.email || user.id} reset their password via the forgot-password flow`,
            });
          }
        })
        .catch((e) => console.error("Audit log (password reset) error:", e));

      res.json({ success: true });
    } catch (error) {
      console.error("Reset-password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  function destroySessionAndRespond(req: any, res: any, preferJson: boolean) {
    const userId = (req.user as SessionUser | undefined)?.claims?.sub;
    const sessionId = req.sessionID as string | undefined;

    // Captured before logout tears down req.user - only used for the audit
    // log entry below, and only for admin/super_admin accounts (see the
    // matching note on the login handler above).
    const loggedOutUser = userId ? authStorage.getUser(userId).catch(() => undefined) : Promise.resolve(undefined);

    const finishLogout = () => {
      req.logout((logoutErr: Error | null) => {
        if (logoutErr) console.error("Logout error:", logoutErr);
        loggedOutUser.then((user) => {
          if (user && (user.role === "admin" || user.role === "super_admin")) {
            authStorage
              .addAuditLogEntry({
                actorUserId: user.id,
                actorLabel: user.email || user.id,
                action: "admin_logout",
                description: `${user.email || user.id} logged out`,
              })
              .catch((e) => console.error("Audit log (logout) error:", e));
          }
        });
        // req.logout() only clears passport user — the session row in Neon must
        // be destroyed too, or the next request still pays a slow session read.
        req.session.destroy((destroyErr: Error | null) => {
          if (destroyErr) console.error("Session destroy error:", destroyErr);
          res.clearCookie("connect.sid", {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          });
          if (preferJson) {
            return res.json({ success: true });
          }
          return res.redirect("/");
        });
      });
    };

    if (userId && sessionId) {
      clearActiveSessionIfMatch(userId, sessionId)
        .catch((err) => console.error("Clear active session error:", err))
        .finally(finishLogout);
      return;
    }

    finishLogout();
  }

  // Preferred by the SPA (no full page reload).
  app.post("/api/logout", (req, res) => {
    destroySessionAndRespond(req, res, true);
  });

  // Legacy link / bookmark support.
  app.get("/api/logout", (req, res) => {
    const wantsJson = req.headers.accept?.includes("application/json");
    destroySessionAndRespond(req, res, Boolean(wantsJson));
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !(req.user as SessionUser | undefined)?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = (req.user as SessionUser).claims.sub;
  try {
    const activeSessionId = await getActiveSessionId(userId);
    if (activeSessionId && activeSessionId !== req.sessionID) {
      return res.status(401).json({
        message: "Your account was signed in on another device.",
        code: "SESSION_SUPERSEDED",
      });
    }
  } catch (err) {
    console.error("Active session check error:", err);
    return res.status(500).json({ message: "Failed to verify session" });
  }

  return next();
};

export { authStorage };
