import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import type { User } from "@shared/models/auth";

/**
 * The plan user limit ("Up to 10 users") is enforced on the server when an
 * owner invites a team member. Runs the real query against an in-memory
 * Postgres (PGlite) with the real team_members table shape.
 */
const { db, plans } = vi.hoisted(() => ({
  db: { current: null as any },
  plans: new Map<string, { id: string; name: string; maxTeamSeats: number | null }>(),
}));

vi.mock("@db", () => ({
  get db() {
    return db.current;
  },
}));
vi.mock("./billingPlans", () => ({
  getBillingPlanById: async (id: string) => plans.get(id),
}));

const { assertCanAddTeamSeat } = await import("./planLimits");

const OWNER = "owner-1";
const future = new Date(Date.now() + 20 * 24 * 3600e3);

function paidUser(planId: string): User {
  return {
    id: OWNER,
    email: "owner@example.com",
    role: "user",
    subscriptionStatus: "active",
    hasPaid: true,
    grantedFreeAccess: false,
    trialEndsAt: null,
    billingPlanId: planId,
    subscriptionEndsAt: future,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  } as User;
}

async function invite(email: string, accountId = "acct-1", status = "pending", owner = OWNER) {
  await db.current.execute(
    sql`INSERT INTO team_members (account_id, owner_user_id, member_email, status) VALUES (${accountId}, ${owner}, ${email}, ${status})`,
  );
}

beforeAll(async () => {
  db.current = drizzle(new PGlite());
  await db.current.execute(sql`
    CREATE TABLE team_members (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id varchar NOT NULL,
      owner_user_id varchar NOT NULL,
      member_email varchar(255) NOT NULL,
      member_user_id varchar(255),
      role varchar(20) NOT NULL DEFAULT 'member',
      status varchar(20) NOT NULL DEFAULT 'pending',
      invited_at timestamp DEFAULT now(),
      accepted_at timestamp
    )`);
  plans.set("growth", { id: "growth", name: "Growth", maxTeamSeats: 10 });
}, 60_000);

beforeEach(async () => {
  await db.current.execute(sql`TRUNCATE team_members`);
});

describe("plan user limit (10 users including the owner)", () => {
  it("allows inviting up to 9 team members, then blocks the 10th with a clear message", async () => {
    const owner = paidUser("growth");
    for (let i = 1; i <= 9; i++) {
      expect((await assertCanAddTeamSeat(owner, `m${i}@example.com`)).ok).toBe(true);
      await invite(`m${i}@example.com`);
    }
    const blocked = await assertCanAddTeamSeat(owner, "m10@example.com");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.code).toBe("plan_seat_limit");
      expect(blocked.message).toMatch(/Growth plan allows up to 10 users/);
    }
  });

  it("counts users across all of the owner's WhatsApp numbers, each email once", async () => {
    const owner = paidUser("growth");
    for (let i = 1; i <= 5; i++) await invite(`m${i}@example.com`, "acct-1");
    for (let i = 5; i <= 9; i++) await invite(`M${i}@Example.com`, "acct-2"); // m5 on both numbers
    // 9 distinct members + owner = 10: a new person is blocked on either number...
    expect((await assertCanAddTeamSeat(owner, "new@example.com")).ok).toBe(false);
    // ...but giving an existing user access to another number takes no new seat.
    expect((await assertCanAddTeamSeat(owner, "m1@example.com")).ok).toBe(true);
  });

  it("frees a seat when a member is revoked, and ignores other customers' members", async () => {
    const owner = paidUser("growth");
    for (let i = 1; i <= 9; i++) await invite(`m${i}@example.com`, "acct-1", i === 1 ? "revoked" : "accepted");
    for (let i = 1; i <= 20; i++) await invite(`other${i}@example.com`, "acct-9", "accepted", "someone-else");
    expect((await assertCanAddTeamSeat(owner, "new@example.com")).ok).toBe(true);
  });

  it("has no user limit when the plan sets none", async () => {
    plans.set("custom", { id: "custom", name: "Custom", maxTeamSeats: null });
    for (let i = 1; i <= 30; i++) await invite(`m${i}@example.com`);
    expect((await assertCanAddTeamSeat(paidUser("custom"), "new@example.com")).ok).toBe(true);
  });
});
