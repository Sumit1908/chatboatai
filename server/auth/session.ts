import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "../db";

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
  const sessionStore = new pgStore({
    pool: pool as any,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: requireEnv("SESSION_SECRET"),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      // Set to e.g. ".chatstream.in" once the app subdomain is live, so a
      // session started on the root domain (login) is also valid on
      // app.<domain> without signing in twice.
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    },
  });
}
