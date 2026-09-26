/**
 * Splits marketing/auth pages (root domain) from the authenticated app
 * (app.<domain> subdomain) once PRIMARY_DOMAIN is configured. A no-op
 * until then, so the raw onrender.com URL, localhost, and preview
 * deployments keep working as a single origin.
 */
import type { Express, RequestHandler } from "express";
import { normalizePrimaryDomain } from "@shared/primaryDomain";

/**
 * The root domain the app is split across, or undefined when the split is
 * disabled. VITE_PRIMARY_DOMAIN is accepted as a fallback because the client
 * bundle already redirects between hosts whenever it is set — if only that
 * one were configured, the server would otherwise ignore the split (no host
 * redirects, host-only session cookie) and every login would bounce between
 * the two hosts.
 */
export function getPrimaryDomain(): string | undefined {
  return normalizePrimaryDomain(process.env.PRIMARY_DOMAIN || process.env.VITE_PRIMARY_DOMAIN);
}

const APP_ONLY_PREFIXES = [
  "/dashboard",
  "/inbox",
  "/templates",
  "/contacts",
  "/notifications",
  "/messages",
  "/analytics",
  "/settings",
  "/billing",
  "/leads",
  "/deals",
  "/pipeline",
  "/follow-ups",
  "/tasks",
  "/automation",
  "/reports",
  "/connected-apps",
  "/whatsapp",
  "/admin",
];

// Pages that must stay on the root domain even for a logged-in visitor
// (login/admin-login especially — the app subdomain never renders them).
const ROOT_ONLY_PATHS = new Set([
  "/",
  "/features",
  "/trust",
  "/how-it-works",
  "/setup-guide",
  "/use-cases",
  "/proof",
  "/pricing",
  "/faq",
  "/crm",
  "/integrations",
  "/login",
  "/admin-login",
  "/forgot-password",
  "/reset-password",
]);

function isAppOnlyPath(path: string): boolean {
  return APP_ONLY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function registerHostRouting(app: Express) {
  const primaryDomain = getPrimaryDomain();
  if (!primaryDomain) return;

  const rootHost = primaryDomain;
  const appHost = `app.${primaryDomain}`;
  const knownHosts = new Set([rootHost, `www.${rootHost}`, appHost]);

  const hostRedirect: RequestHandler = (req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();

    const host = req.hostname;
    if (!knownHosts.has(host)) return next();

    if (host !== appHost && isAppOnlyPath(req.path)) {
      return res.redirect(302, `https://${appHost}${req.originalUrl}`);
    }
    if (host === appHost && ROOT_ONLY_PATHS.has(req.path)) {
      return res.redirect(302, `https://${rootHost}${req.originalUrl}`);
    }
    next();
  };

  app.use(hostRedirect);
}
