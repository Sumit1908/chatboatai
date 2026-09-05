import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Express, RequestHandler } from "express";
import { db } from "@db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { authStorage } from "./storage";
import { getSession } from "./session";
import { sendVerificationEmail } from "../email";
import {
  activateUserSession,
  clearActiveSessionIfMatch,
  getActiveSessionId,
} from "./singleSession";
import { TRIAL_DAYS } from "../trialLimits";
import { blockExpiredTrialWrites } from "../subscriptionGate";

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

  app.post("/api/login", (req, res, next) => {
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
          return res.json({ success: true, user: fullUser || null });
        } catch (e) {
          console.error("Login user hydrate error:", e);
          return res.json({ success: true, user: null });
        }
      });
    })(req, res, next);
  });

  function destroySessionAndRespond(req: any, res: any, preferJson: boolean) {
    const userId = (req.user as SessionUser | undefined)?.claims?.sub;
    const sessionId = req.sessionID as string | undefined;

    const finishLogout = () => {
      req.logout((logoutErr: Error | null) => {
        if (logoutErr) console.error("Logout error:", logoutErr);
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
