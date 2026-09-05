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

export function slugifyPlanName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "plan";
}

/** Seed catalog used when the billing_plans table is empty. */
export const DEFAULT_BILLING_PLAN_SEEDS: Omit<
  InsertableSeed,
  "id" | "createdAt" | "updatedAt" | "razorpayPlanId"
>[] = [
  {
    slug: "starter",
    name: "Starter",
    tagline: "For small teams getting started",
    amountInr: 1999,
    period: "month",
    featured: false,
    active: true,
    razorpayEnabled: true,
    features: [
      "1 WhatsApp number",
      "2,500 contacts",
      "10 message templates",
      "Broadcast campaigns",
      "Basic analytics",
      "Email support",
    ],
    sortOrder: 10,
    maxContacts: 2500,
    maxMessagesPerDay: null,
    maxWhatsappNumbers: 1,
    maxTemplates: 10,
    maxTeamSeats: 1,
  },
  {
    slug: "growth",
    name: "Growth",
    tagline: "For growing sales & marketing teams",
    amountInr: 4999,
    period: "month",
    featured: true,
    active: true,
    razorpayEnabled: true,
    features: [
      "1 WhatsApp number",
      "25,000 contacts",
      "Unlimited templates",
      "Shared team inbox (5 seats)",
      "Campaign scheduling & segments",
      "Real-time delivery analytics",
      "Priority WhatsApp support",
    ],
    sortOrder: 20,
    maxContacts: 25000,
    maxMessagesPerDay: null,
    maxWhatsappNumbers: 1,
    maxTemplates: null,
    maxTeamSeats: 5,
  },
  {
    slug: "scale",
    name: "Scale",
    tagline: "For agencies & high-volume senders",
    amountInr: 9999,
    period: "month",
    featured: false,
    active: true,
    razorpayEnabled: true,
    features: [
      "Multiple WhatsApp numbers",
      "Unlimited contacts",
      "Unlimited templates & campaigns",
      "Team inbox (unlimited seats)",
      "Multi-client workspaces",
      "API access & webhooks",
      "Dedicated account manager",
    ],
    sortOrder: 30,
    maxContacts: null,
    maxMessagesPerDay: null,
    maxWhatsappNumbers: null,
    maxTemplates: null,
    maxTeamSeats: null,
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
