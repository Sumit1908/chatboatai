import { describe, it, expect } from "vitest";
import type { User } from "@shared/models/auth";

// planLimits.ts imports the DB pool (`@db`) at module scope purely so the
// account/usage-counting functions can query it; `pg.Pool` doesn't open a
// connection until a query actually runs, so a placeholder URL is enough to
// import the module and exercise the pure eligibility functions below
// without a real database. Must be set before the dynamic import below,
// since module evaluation (and @db's env check) happens at import time.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

const { isPaidActiveUser } = await import("./planLimits");

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
