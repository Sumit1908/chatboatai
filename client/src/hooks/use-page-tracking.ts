import { useEffect } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "wa_broadcast_visitor_session";

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Fires on every route change, logged in or not, so the admin dashboard can
// see the full visitor funnel (landing page visits included, not just
// in-app navigation).
export function usePageTracking() {
  const [location] = useLocation();

  useEffect(() => {
    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        path: location,
        sessionId: getSessionId(),
        referrer: document.referrer || undefined,
      }),
    }).catch(() => {});
  }, [location]);
}
