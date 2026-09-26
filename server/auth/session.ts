import session from "express-session";
import connectPg from "connect-pg-simple";
import type { RequestHandler } from "express";
import { pool } from "../db";
import { getPrimaryDomain } from "../hostRouting";
import { isHostUnderDomain, normalizePrimaryDomain } from "@shared/primaryDomain";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set. Add it to your environment/.env file.`);
  }
  return value;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  // Reuse the app's pg Pool instead of opening a second connection string
  // pool — every request hits sessions, and dual pools doubled Neon churn.
  // One store per session middleware: express-session installs its cookie
  // factory on the store object, so middlewares sharing a store would all
  // issue cookies with the last one's options (domain included).
  const makeStore = (prune: boolean) =>
    new pgStore({
      pool: pool as any,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
      ...(prune ? {} : { pruneSessionInterval: false }),
    });
  const secret = requireEnv("SESSION_SECRET");
  const makeSession = (domain?: string) =>
    session({
      secret,
      // Only the host-only (always-created) store prunes expired rows.
      store: makeStore(!domain),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
        ...(domain ? { domain } : {}),
      },
    });

  // Login happens on the root domain but the app (and /admin) lives on
  // app.<domain>, so once the host split is on the session cookie must be
  // scoped to ".<domain>" or the app host never sees it: the client then
  // treats the user as logged out and bounces them back to root /login,
  // which (still logged in there) sends them back to app.<domain> - an
  // endless loop. COOKIE_DOMAIN overrides; otherwise it's derived from
  // PRIMARY_DOMAIN in production. The shared cookie is only applied to hosts
  // under that domain - browsers reject a Domain attribute that doesn't
  // match the request host, which would break login on the raw
  // *.onrender.com URL or localhost.
  const primaryDomain = getPrimaryDomain();
  const cookieDomain =
    normalizePrimaryDomain(process.env.COOKIE_DOMAIN) ??
    (process.env.NODE_ENV === "production" ? primaryDomain : undefined);
  const hostOnlySession = makeSession();
  if (!cookieDomain) return hostOnlySession;

  const sharedSession = makeSession(`.${cookieDomain}`);
  const handler: RequestHandler = (req, res, next) =>
    isHostUnderDomain(req.hostname, cookieDomain)
      ? sharedSession(req, res, next)
      : hostOnlySession(req, res, next);
  return handler;
}
