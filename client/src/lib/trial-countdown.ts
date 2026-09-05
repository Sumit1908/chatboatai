/** Format milliseconds remaining as `Xd HH:MM:SS` or `HH:MM:SS`. */
export function formatTrialRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";

  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function getTrialRemainingMs(endsAt: string | null | undefined): number {
  if (!endsAt) return 0;
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}
