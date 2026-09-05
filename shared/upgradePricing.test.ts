import { describe, it, expect } from "vitest";
import { addMonths, diffDays, calculateProRataUpgrade } from "./upgradePricing";

describe("addMonths", () => {
  it("advances the month while preserving day/time", () => {
    const result = addMonths(new Date("2026-01-15T10:00:00Z"), 1);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(15);
  });

  it("does not mutate the input date", () => {
    const original = new Date("2026-01-15T10:00:00Z");
    const copy = new Date(original);
    addMonths(original, 1);
    expect(original.getTime()).toBe(copy.getTime());
  });
});

describe("diffDays", () => {
  it("returns whole days between two dates, rounded up", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = new Date("2026-01-02T00:00:01Z");
    expect(diffDays(start, end)).toBe(2);
  });

  it("never returns a negative value when end precedes start", () => {
    const start = new Date("2026-01-10T00:00:00Z");
    const end = new Date("2026-01-01T00:00:00Z");
    expect(diffDays(start, end)).toBe(0);
  });
});

describe("calculateProRataUpgrade", () => {
  it("falls back to full-price delta when there is no subscriptionEndsAt", () => {
    const result = calculateProRataUpgrade({
      fromPlanAmountInr: 1999,
      toPlanAmountInr: 4999,
      subscriptionEndsAt: null,
    });

    expect(result.usesProRata).toBe(false);
    expect(result.payableInr).toBe(3000); // 4999 - 1999
  });

  it("falls back when subscriptionEndsAt has already passed", () => {
    const asOf = new Date("2026-02-01T00:00:00Z");
    const result = calculateProRataUpgrade({
      fromPlanAmountInr: 1999,
      toPlanAmountInr: 4999,
      subscriptionEndsAt: new Date("2026-01-01T00:00:00Z"),
      asOf,
    });

    expect(result.usesProRata).toBe(false);
  });

  it("charges the toAmount minus 1 rupee when upgrading is free (fallback floor)", () => {
    const result = calculateProRataUpgrade({
      fromPlanAmountInr: 4999,
      toPlanAmountInr: 1999,
      subscriptionEndsAt: null,
    });

    // toAmount - fromAmount is negative, so payable floors at 1 rupee, never 0 or negative.
    expect(result.payableInr).toBe(1);
  });

  it("credits unused days pro-rata when mid-cycle", () => {
    // 30-day period, upgrading exactly halfway through (15 days used, 15 remaining).
    const periodEnd = new Date("2026-01-31T00:00:00Z");
    const asOf = new Date("2026-01-16T00:00:00Z");

    const result = calculateProRataUpgrade({
      fromPlanAmountInr: 2000,
      toPlanAmountInr: 5000,
      subscriptionEndsAt: periodEnd,
      asOf,
    });

    expect(result.usesProRata).toBe(true);
    expect(result.totalDays).toBe(30);
    expect(result.daysUsed).toBe(15);
    expect(result.daysRemaining).toBe(15);
    expect(result.usedValueInr).toBe(1000); // half of 2000
    expect(result.remainingCreditInr).toBe(1000); // unused half
    expect(result.payableInr).toBe(4000); // 5000 - 1000 credit
  });

  it("never lets remaining credit make the upgrade free or negative", () => {
    // Barely used any of the current period: nearly the full amount is credited back.
    const periodEnd = new Date("2026-02-01T00:00:00Z");
    const asOf = new Date("2026-01-02T00:00:00Z"); // 1 day used of 30

    const result = calculateProRataUpgrade({
      fromPlanAmountInr: 4999,
      toPlanAmountInr: 4999,
      subscriptionEndsAt: periodEnd,
      asOf,
    });

    expect(result.payableInr).toBeGreaterThanOrEqual(1);
  });

  it("clamps daysUsed at totalDays when asOf is far past periodStart", () => {
    const periodEnd = new Date("2026-01-31T00:00:00Z");
    const asOf = new Date("2026-01-30T23:59:59Z");

    const result = calculateProRataUpgrade({
      fromPlanAmountInr: 2000,
      toPlanAmountInr: 5000,
      subscriptionEndsAt: periodEnd,
      asOf,
    });

    expect(result.daysUsed).toBeLessThanOrEqual(result.totalDays);
    expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
  });
});
