import crypto from "crypto";
import type { RequestHandler } from "express";

/**
 * Minimal session-synchronizer-token CSRF protection.
 *
 * No new dependency needed: the token is bound to the existing session
 * (express-session + connect-pg-simple, already set up in server/auth/session.ts)
 * rather than a separate cookie. The client fetches it once via GET
 * /api/csrf-token and echoes it back as an X-CSRF-Token header on
 * state-changing requests; the server checks it matches the value stored
 * in that same session.
 *
 * Scope: applied to /api/admin/* (see server/routes.ts) and the admin
 * change-password route (see server/auth/localAuth.ts) — the highest-value,
 * highest-blast-radius surface (delete user, change role, edit plans, etc.).
 * Deliberately NOT applied to /api/login or /api/register: those are shared
 * by the public-facing signup/login pages, which don't yet fetch a CSRF
 * token, and login rate limiting already covers that surface's main risk.
 * Broadening CSRF to every tenant-facing mutation is a reasonable follow-up
 * that requires updating those public pages in lockstep.
 */
export function ensureCsrfToken(req: any): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfToken;
}

export const verifyCsrf: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  const sessionToken = (req as any).session?.csrfToken;
  const headerToken = req.headers["x-csrf-token"];
  if (!sessionToken || !headerToken || headerToken !== sessionToken) {
    return res.status(403).json({ error: "Invalid or missing CSRF token" });
  }
  next();
};
