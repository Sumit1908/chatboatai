import type { BillingPlanRow } from "./schema";

/** Public shape returned by APIs and used by marketing / billing UI. */
export interface BillingPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  priceLabel: string;
  amountInr: number;
  period: string;
  featured: boolean;
  active: boolean;
  features: string[];
  razorpayEnabled: boolean;
  sortOrder: number;
  maxContacts: number | null;
  maxMessagesPerDay: number | null;
  maxWhatsappNumbers: number | null;
  maxTemplates: number | null;
  maxTeamSeats: number | null;
  razorpayPlanId: string | null;
}

export function formatPriceLabel(amountInr: number): string {
  return `₹${amountInr.toLocaleString("en-IN")}`;
}

export function toBillingPlan(row: BillingPlanRow): BillingPlan {
  const features = Array.isArray(row.features) ? row.features : [];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline || "",
    priceLabel: formatPriceLabel(row.amountInr),
    amountInr: row.amountInr,
    period: row.period || "month",
    featured: !!row.featured,
    active: !!row.active,
    features,
    razorpayEnabled: !!row.razorpayEnabled,
    sortOrder: row.sortOrder ?? 0,
    maxContacts: row.maxContacts ?? null,
    maxMessagesPerDay: row.maxMessagesPerDay ?? null,
    maxWhatsappNumbers: row.maxWhatsappNumbers ?? null,
    maxTemplates: row.maxTemplates ?? null,
    maxTeamSeats: row.maxTeamSeats ?? null,
    razorpayPlanId: row.razorpayPlanId ?? null,
  };
}

export type PlanCheckoutStatus = {
  /** True when a customer can pay for this plan through Razorpay right now. */
  canBuy: boolean;
  /** Plain-language reasons it can't be bought (empty when canBuy). */
  reasons: string[];
};

/**
 * Whether customers can buy a plan, using the same rules checkout applies
 * (POST /api/subscription/create): the plan must be visible, have Razorpay
 * checkout on, cost at least ₹1 (Razorpay's minimum), and the server must
 * have Razorpay keys configured.
 */
export function planCheckoutStatus(
  plan: Pick<BillingPlan, "active" | "razorpayEnabled" | "amountInr">,
  razorpayConfigured: boolean,
): PlanCheckoutStatus {
  const reasons: string[] = [];
  if (!plan.active) reasons.push("Hidden from the website and billing page");
  if (!plan.razorpayEnabled) reasons.push("Razorpay checkout is turned off for this plan (customers see “Talk to Us”)");
  if (!Number.isFinite(plan.amountInr) || plan.amountInr < 1) reasons.push("Price must be at least ₹1");
  if (!razorpayConfigured) reasons.push("Razorpay keys are not configured on the server");
  return { canBuy: reasons.length === 0, reasons };
}

export function slugifyPlanName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "plan";
}

/**
 * Seed catalog, inserted ONLY when the billing_plans table is empty (new
 * database). Existing plans are never overwritten - live prices and features
 * are managed in Admin -> Pricing Plans. Features listed here must be things
 * the product actually does. Support delivered by people (not software) is
 * written "Service: ..." and shown under "Support from our team" on pricing.
 */
export const DEFAULT_BILLING_PLAN_SEEDS: Omit<
  InsertableSeed,
  "id" | "createdAt" | "updatedAt" | "razorpayPlanId"
>[] = [
  {
    slug: "starter",
    name: "Starter",
    tagline: "For small teams getting started",
    amountInr: 9999,
    period: "month",
    featured: false,
    active: true,
    razorpayEnabled: true,
    features: [
      "Up to 10 users",
      "Complete CRM: leads, deals & sales pipeline",
      "Tasks, follow-ups & CRM dashboard",
      "1 WhatsApp number",
      "5,000 contacts",
      "10 message templates",
      "Campaigns (send now or scheduled) & shared inbox",
      "Delivery analytics",
      "Service: email support",
    ],
    sortOrder: 10,
    maxContacts: 5000,
    maxMessagesPerDay: null,
    maxWhatsappNumbers: 1,
    maxTemplates: 10,
    maxTeamSeats: 10,
  },
  {
    slug: "growth",
    name: "Growth",
    tagline: "For growing teams",
    amountInr: 19999,
    period: "month",
    featured: true,
    active: true,
    razorpayEnabled: true,
    features: [
      "Everything in Starter",
      "Up to 10 users",
      "25,000 contacts",
      "Unlimited templates",
      "Service: priority support on WhatsApp",
    ],
    sortOrder: 20,
    maxContacts: 25000,
    maxMessagesPerDay: null,
    maxWhatsappNumbers: 1,
    maxTemplates: null,
    maxTeamSeats: 10,
  },
  {
    slug: "scale",
    name: "Scale",
    tagline: "For businesses needing a more customised CRM environment",
    amountInr: 29999,
    period: "month",
    featured: false,
    active: true,
    // Sales-led: the pricing card shows "Talk to Us" instead of online checkout.
    razorpayEnabled: false,
    features: [
      "Everything in Growth",
      "Up to 10 users",
      "Multiple WhatsApp numbers",
      "Unlimited contacts",
      "Separate contacts, templates & inbox per number",
      "Service: custom CRM setup & configuration",
      "Service: help with custom integrations",
      "Service: dedicated account manager",
    ],
    sortOrder: 30,
    maxContacts: null,
    maxMessagesPerDay: null,
    maxWhatsappNumbers: null,
    maxTemplates: null,
    maxTeamSeats: 10,
  },
];

type InsertableSeed = {
  id?: string;
  slug: string;
  name: string;
  tagline: string;
  amountInr: number;
  period: string;
  featured: boolean;
  active: boolean;
  razorpayEnabled: boolean;
  features: string[];
  sortOrder: number;
  maxContacts: number | null;
  maxMessagesPerDay: number | null;
  maxWhatsappNumbers: number | null;
  maxTemplates: number | null;
  maxTeamSeats: number | null;
  razorpayPlanId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};
