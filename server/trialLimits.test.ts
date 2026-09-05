import { describe, it, expect } from "vitest";
import type { User } from "@shared/models/auth";

// trialLimits.ts imports the DB pool (`@db`) at module scope purely so the
// account/usage-counting functions can query it; `pg.Pool` doesn't open a
// connection until a query actually runs, so a placeholder URL is enough to
// import the module and exercise the pure eligibility functions below
// without a real database. Must be set before the dynamic import below,
// since module evaluation (and @db's env check) happens at import time.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

const { getEffectiveTrialEndsAt, isTrialUser, isPaidActiveUser, TRIAL_DAYS } = await import(
  "./trialLimits"
);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "user@example.com",
    role: "user",
    subscriptionStatus: "inactive",
    hasPaid: false,
    grantedFreeAccess: false,
    trialEndsAt: null,
    billingPlanId: null,
    subscriptionEndsAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as User;
}

describe("getEffectiveTrialEndsAt", () => {
  it("returns null for a non-trial user", () => {
    const user = makeUser({ subscriptionStatus: "active" });
    expect(getEffectiveTrialEndsAt(user)).toBeNull();
  });

  it("returns null when trialEndsAt is missing", () => {
    const user = makeUser({ subscriptionStatus: "trial", trialEndsAt: null });
    expect(getEffectiveTrialEndsAt(user)).toBeNull();
  });

  it("caps a trial that was stored with a longer-than-allowed window to TRIAL_DAYS from signup", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const storedEnd = new Date("2026-02-01T00:00:00Z"); // 31 days out, way past the 7-day cap
    const user = makeUser({ subscriptionStatus: "trial", createdAt, trialEndsAt: storedEnd });

    const effective = getEffectiveTrialEndsAt(user);
    const expectedCap = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    expect(effective?.getTime()).toBe(expectedCap.getTime());
  });

  it("uses the stored end date when it is earlier than the TRIAL_DAYS cap", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const storedEnd = new Date("2026-01-03T00:00:00Z"); // only 2 days out
    const user = makeUser({ subscriptionStatus: "trial", createdAt, trialEndsAt: storedEnd });

    expect(getEffectiveTrialEndsAt(user)?.getTime()).toBe(storedEnd.getTime());
  });
});

describe("isTrialUser", () => {
  it("is false for a super_admin even if subscriptionStatus is trial", () => {
    const user = makeUser({
      role: "super_admin",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() + 86_400_000),
    });
    expect(isTrialUser(user)).toBe(false);
  });

  it("is false for a user with grantedFreeAccess", () => {
    const user = makeUser({
      grantedFreeAccess: true,
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() + 86_400_000),
    });
    expect(isTrialUser(user)).toBe(false);
  });

  it("is false for an active paid user", () => {
    const user = makeUser({ hasPaid: true, subscriptionStatus: "active" });
    expect(isTrialUser(user)).toBe(false);
  });

  it("is true for a trial user whose effective end date is in the future", () => {
    const user = makeUser({
      subscriptionStatus: "trial",
      createdAt: new Date(),
      trialEndsAt: new Date(Date.now() + 86_400_000),
    });
    expect(isTrialUser(user)).toBe(true);
  });

  it("is false once the trial end date has passed", () => {
    const user = makeUser({
      subscriptionStatus: "trial",
      createdAt: new Date(Date.now() - 30 * 86_400_000),
      trialEndsAt: new Date(Date.now() - 86_400_000),
    });
    expect(isTrialUser(user)).toBe(false);
  });
});

describe("isPaidActiveUser", () => {
  it("is false for super_admin / grantedFreeAccess users", () => {
    expect(
      isPaidActiveUser(makeUser({ role: "super_admin", hasPaid: true, subscriptionStatus: "active" })),
    ).toBe(false);
    expect(
      isPaidActiveUser(makeUser({ grantedFreeAccess: true, hasPaid: true, subscriptionStatus: "active" })),
    ).toBe(false);
  });

  it("is false when hasPaid is false, regardless of subscriptionStatus", () => {
    expect(isPaidActiveUser(makeUser({ hasPaid: false, subscriptionStatus: "active" }))).toBe(false);
  });

  it("is false when subscriptionStatus is not active", () => {
    expect(isPaidActiveUser(makeUser({ hasPaid: true, subscriptionStatus: "canceled" }))).toBe(false);
  });

  it("is false once subscriptionEndsAt has passed, even if status is still active", () => {
    const user = makeUser({
      hasPaid: true,
      subscriptionStatus: "active",
      subscriptionEndsAt: new Date(Date.now() - 1000),
    });
    expect(isPaidActiveUser(user)).toBe(false);
  });

  it("is true for a paid, active user within their subscription window", () => {
    const user = makeUser({
      hasPaid: true,
      subscriptionStatus: "active",
      subscriptionEndsAt: new Date(Date.now() + 30 * 86_400_000),
    });
    expect(isPaidActiveUser(user)).toBe(true);
  });

  it("is true for a paid, active user with no subscriptionEndsAt set", () => {
    const user = makeUser({ hasPaid: true, subscriptionStatus: "active", subscriptionEndsAt: null });
    expect(isPaidActiveUser(user)).toBe(true);
  });
});
