import { useEffect } from "react";
import { useLocation } from "wouter";
import { CONTENT_SEO } from "@/lib/seo";

/** Public GA4 measurement ID for Sampark content pages. */
export const GA_MEASUREMENT_ID = "G-LQX0MSZPW4";

declare global {
  interface Window {
    dataLayer?: unknown[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

function isContentPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return path in CONTENT_SEO;
}

function ensureGtagLoaded() {
  if (typeof window.gtag === "function") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);

  if (!document.getElementById("ga4-gtag")) {
    const script = document.createElement("script");
    script.id = "ga4-gtag";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }
}

/**
 * Google Analytics 4 on marketing/content pages only.
 * Initial tag also ships in index.html; this keeps SPA route changes tracked.
 */
export function GoogleAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    if (!isContentPath(location)) return;

    ensureGtagLoaded();
    window.gtag?.("config", GA_MEASUREMENT_ID, {
      page_path: location,
      page_location: `${window.location.origin}${location}`,
    });
  }, [location]);

  return null;
}
