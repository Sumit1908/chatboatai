/**
 * Marketing pages retired when the public site was simplified to Home,
 * Pricing, Contact, Login and Sign Up. Their URLs permanently redirect to the
 * matching home-page section so old links and search results keep working.
 * Used by the server (301 redirects) and the client router (fallback).
 */
export const RETIRED_PAGE_REDIRECTS: Readonly<Record<string, string>> = {
  "/features": "/#features",
  "/crm": "/#product",
  "/integrations": "/#integrations",
  "/how-it-works": "/#how-it-works",
  "/setup-guide": "/#integrations",
  "/faq": "/#faq",
  "/use-cases": "/",
  "/trust": "/",
  "/proof": "/",
};
