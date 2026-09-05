/**
 * Security headers, host canonicalization, and HSTS for production.
 * Preferred host comes from APP_URL (e.g. https://sampark.tech).
 */
import type { Express, RequestHandler } from "express";

function preferredOrigin(): URL | null {
  const raw = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function registerSecurityAndCanonicalMiddleware(app: Express) {
  app.disable("x-powered-by");

  const securityHeaders: RequestHandler = (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    if (process.env.NODE_ENV === "production") {
      // 2 years, include subdomains, allow preload lists
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
    }
    next();
  };

  app.use(securityHeaders);
}
