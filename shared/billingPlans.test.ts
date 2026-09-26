import { describe, it, expect } from "vitest";
import { formatPriceLabel, toBillingPlan, slugifyPlanName, planCheckoutStatus } from "./billingPlans";
import type { BillingPlanRow } from "./schema";

describe("formatPriceLabel", () => {
  it("formats an amount as Indian-locale rupees", () => {
    expect(formatPriceLabel(4999)).toBe("₹4,999");
  });

  it("groups large numbers using the Indian numbering system (lakh)", () => {
    expect(formatPriceLabel(150000)).toBe("₹1,50,000");
  });

  it("handles zero", () => {
    expect(formatPriceLabel(0)).toBe("₹0");
  });
});

describe("slugifyPlanName", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyPlanName("Growth Plan")).toBe("growth-plan");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugifyPlanName("Pro+ (Team)!")).toBe("pro-team");
  });

  it("trims leading/trailing hyphens produced by punctuation", () => {
    expect(slugifyPlanName("--Starter--")).toBe("starter");
  });

  it("falls back to 'plan' when nothing alphanumeric remains", () => {
    expect(slugifyPlanName("!!!")).toBe("plan");
  });

  it("truncates to 64 characters", () => {
    const long = "a".repeat(100);
    expect(slugifyPlanName(long).length).toBe(64);
  });
});

describe("toBillingPlan", () => {
  const baseRow: BillingPlanRow = {
    id: "plan-1",
    slug: "growth",
    name: "Growth",
    tagline: "For growing teams",
    amountInr: 4999,
    period: "month",
    featured: true,
    active: true,
    razorpayEnabled: true,
    features: ["1 WhatsApp number", "25,000 contacts"],
    sortOrder: 20,
    maxContacts: 25000,
    maxMessagesPerDay: null,
    maxWhatsappNumbers: 1,
    maxTemplates: null,
    maxTeamSeats: 5,
    razorpayPlanId: "plan_abc123",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  it("maps a DB row to the public billing plan shape, including a formatted price label", () => {
    const plan = toBillingPlan(baseRow);
    expect(plan).toMatchObject({
      id: "plan-1",
      slug: "growth",
      name: "Growth",
      priceLabel: "₹4,999",
      amountInr: 4999,
      maxContacts: 25000,
      maxMessagesPerDay: null,
      razorpayPlanId: "plan_abc123",
    });
  });

  it("defaults features to an empty array when the column is not an array", () => {
    const row = { ...baseRow, features: null as unknown as string[] };
    expect(toBillingPlan(row).features).toEqual([]);
  });

  it("defaults nullable limit columns to null rather than undefined", () => {
    const row = {
      ...baseRow,
      maxContacts: undefined as unknown as number | null,
      sortOrder: undefined as unknown as number,
    };
    const plan = toBillingPlan(row);
    expect(plan.maxContacts).toBeNull();
    expect(plan.sortOrder).toBe(0);
  });

  it("coerces nullable booleans defensively", () => {
    const row = { ...baseRow, featured: 0 as unknown as boolean, active: 1 as unknown as boolean };
    const plan = toBillingPlan(row);
    expect(plan.featured).toBe(false);
    expect(plan.active).toBe(true);
  });
});

describe("planCheckoutStatus", () => {
  const plan = { active: true, razorpayEnabled: true, amountInr: 1999 };

  it("can be bought when visible, checkout is on, priced and Razorpay is configured", () => {
    expect(planCheckoutStatus(plan, true)).toEqual({ canBuy: true, reasons: [] });
  });

  it("explains each reason a plan can't be bought", () => {
    expect(planCheckoutStatus({ ...plan, active: false }, true).reasons).toEqual(["Hidden from the website and billing page"]);
    expect(planCheckoutStatus({ ...plan, razorpayEnabled: false }, true).reasons[0]).toMatch(/checkout is turned off/);
    expect(planCheckoutStatus({ ...plan, amountInr: 0 }, true).reasons).toEqual(["Price must be at least ₹1"]);
    expect(planCheckoutStatus(plan, false).reasons).toEqual(["Razorpay keys are not configured on the server"]);
  });

  it("lists every problem at once, not just the first", () => {
    const status = planCheckoutStatus({ active: false, razorpayEnabled: false, amountInr: 0 }, false);
    expect(status.canBuy).toBe(false);
    expect(status.reasons).toHaveLength(4);
  });

  it("treats ₹1 as a valid (Razorpay minimum) price", () => {
    expect(planCheckoutStatus({ ...plan, amountInr: 1 }, true).canBuy).toBe(true);
  });
});
