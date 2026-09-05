import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

// Was 8s and included /api/messages (full-table). That hammered Neon on every
// authenticated page. Prefer websockets for push; poll lightly as a fallback.
const SYNC_INTERVAL_MS = 30_000;

const SYNCED_QUERY_KEYS = [
  ["/api/templates"],
  ["/api/campaigns"],
  ["/api/dashboard/metrics"],
  ["/api/dashboard/activities"],
  ["/api/settings"],
];

export function useRealtimeSync() {
  useEffect(() => {
    const tick = () => {
      for (const queryKey of SYNCED_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    const interval = setInterval(tick, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
