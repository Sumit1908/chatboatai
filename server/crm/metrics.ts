import { isClosedStage, type DealStage } from "@shared/crm";

/**
 * Pure CRM calculations (no database) - kept separate so they're unit-tested.
 */

/** India Standard Time is UTC+5:30 all year (no daylight saving). */
const IST_OFFSET_MINUTES = 330;

/**
 * Calendar-month boundaries in IST, returned as UTC instants for querying.
 * "This month" must follow the business's clock, not the server's (UTC):
 * a deal won at 1:00 AM IST on the 1st belongs to the new month.
 */
export function monthBoundsIst(now: Date): {
  lastMonthStart: Date;
  thisMonthStart: Date;
  nextMonthStart: Date;
} {
  const offsetMs = IST_OFFSET_MINUTES * 60_000;
  const ist = new Date(now.getTime() + offsetMs); // wall-clock IST in UTC fields
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const at = (year: number, month: number) => new Date(Date.UTC(year, month, 1) - offsetMs);
  return {
    lastMonthStart: at(y, m - 1),
    thisMonthStart: at(y, m),
    nextMonthStart: at(y, m + 1),
  };
}

/** Start of "today" in IST, as a UTC instant. */
export function startOfTodayIst(now: Date): Date {
  const offsetMs = IST_OFFSET_MINUTES * 60_000;
  const ist = new Date(now.getTime() + offsetMs);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - offsetMs);
}

/**
 * Whole-number % change vs the previous period. null when there is no
 * baseline (previous = 0) - showing "+100%" or "∞" there would be misleading.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * closed_at after a stage change: set when a deal first enters won/lost,
 * kept when it moves between closed stages, cleared when it is reopened.
 */
export function closedAtForStageChange(
  previous: DealStage | null,
  next: DealStage,
  previousClosedAt: Date | null,
  now: Date,
): Date | null {
  if (!isClosedStage(next)) return null;
  if (previous && isClosedStage(previous) && previousClosedAt) return previousClosedAt;
  return now;
}

/** Numeric result from SQL aggregates (pg returns bigint/numeric as strings). */
export function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
