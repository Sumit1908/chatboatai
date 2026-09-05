import { db } from "@db";
import { billingPlans, type BillingPlanRow, type InsertBillingPlan } from "@shared/schema";
import {
  DEFAULT_BILLING_PLAN_SEEDS,
  slugifyPlanName,
  toBillingPlan,
  type BillingPlan,
} from "@shared/billingPlans";
import { asc, eq, sql } from "drizzle-orm";

let seeded = false;

async function ensureBillingPlansTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS billing_plans (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      slug varchar(64) NOT NULL UNIQUE,
      name varchar(120) NOT NULL,
      tagline text NOT NULL DEFAULT '',
      amount_inr integer NOT NULL,
      period varchar(20) NOT NULL DEFAULT 'month',
      featured boolean NOT NULL DEFAULT false,
      active boolean NOT NULL DEFAULT true,
      razorpay_enabled boolean NOT NULL DEFAULT true,
      features jsonb NOT NULL DEFAULT '[]'::jsonb,
      sort_order integer NOT NULL DEFAULT 0,
      max_contacts integer,
      max_messages_per_day integer,
      max_whatsapp_numbers integer,
      max_templates integer,
      max_team_seats integer,
      razorpay_plan_id varchar,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS billing_plans_active_sort_idx
    ON billing_plans (active, sort_order)
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_plan_id varchar
  `);
}

/** Upsert seed catalog by slug so local DEFAULT_BILLING_PLAN_SEEDS stay in sync. */
export async function syncDefaultBillingPlans(): Promise<void> {
  await ensureBillingPlansTable();
  for (const seed of DEFAULT_BILLING_PLAN_SEEDS) {
    const [existing] = await db.select().from(billingPlans).where(eq(billingPlans.slug, seed.slug));
    if (!existing) {
      await db.insert(billingPlans).values({ ...seed, features: seed.features });
      continue;
    }
    await db
      .update(billingPlans)
      .set({
        name: seed.name,
        tagline: seed.tagline,
        amountInr: seed.amountInr,
        period: seed.period,
        featured: seed.featured,
        active: seed.active,
        razorpayEnabled: seed.razorpayEnabled,
        features: seed.features,
        sortOrder: seed.sortOrder,
        maxContacts: seed.maxContacts,
        maxMessagesPerDay: seed.maxMessagesPerDay,
        maxWhatsappNumbers: seed.maxWhatsappNumbers,
        maxTemplates: seed.maxTemplates,
        maxTeamSeats: seed.maxTeamSeats,
        razorpayPlanId: existing.amountInr !== seed.amountInr ? null : existing.razorpayPlanId,
        updatedAt: new Date(),
      })
      .where(eq(billingPlans.id, existing.id));
  }
  seeded = true;
  console.log(`[BillingPlans] Synced ${DEFAULT_BILLING_PLAN_SEEDS.length} plans from seed`);
}

export async function ensureBillingPlansSeeded(): Promise<void> {
  if (seeded) return;
  await ensureBillingPlansTable();
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(billingPlans);
  if ((Number(row?.count) || 0) === 0) {
    await db.insert(billingPlans).values(
      DEFAULT_BILLING_PLAN_SEEDS.map((plan) => ({
        ...plan,
        features: plan.features,
      })),
    );
    console.log(`[BillingPlans] Seeded ${DEFAULT_BILLING_PLAN_SEEDS.length} default plans`);
  }
  seeded = true;
}

export async function listAllBillingPlans(): Promise<BillingPlan[]> {
  await ensureBillingPlansSeeded();
  const rows = await db.select().from(billingPlans).orderBy(asc(billingPlans.sortOrder), asc(billingPlans.name));
  return rows.map(toBillingPlan);
}

export async function listActiveBillingPlans(): Promise<BillingPlan[]> {
  await ensureBillingPlansSeeded();
  const rows = await db
    .select()
    .from(billingPlans)
    .where(eq(billingPlans.active, true))
    .orderBy(asc(billingPlans.sortOrder), asc(billingPlans.name));
  return rows.map(toBillingPlan);
}

export async function getBillingPlanById(id: string): Promise<BillingPlan | undefined> {
  await ensureBillingPlansSeeded();
  const [row] = await db.select().from(billingPlans).where(eq(billingPlans.id, id));
  return row ? toBillingPlan(row) : undefined;
}

export async function getBillingPlanBySlug(slug: string): Promise<BillingPlan | undefined> {
  await ensureBillingPlansSeeded();
  const [row] = await db.select().from(billingPlans).where(eq(billingPlans.slug, slug));
  return row ? toBillingPlan(row) : undefined;
}

export async function getDefaultBillingPlan(): Promise<BillingPlan | undefined> {
  const plans = await listActiveBillingPlans();
  return plans.find((p) => p.featured) ?? plans[0];
}

export async function getCheapestActivePlan(): Promise<BillingPlan | undefined> {
  const plans = await listActiveBillingPlans();
  if (plans.length === 0) return undefined;
  return [...plans].sort((a, b) => a.amountInr - b.amountInr)[0];
}

export type BillingPlanInput = {
  slug?: string;
  name: string;
  tagline?: string;
  amountInr: number;
  period?: string;
  featured?: boolean;
  active?: boolean;
  razorpayEnabled?: boolean;
  features?: string[];
  sortOrder?: number;
  maxContacts?: number | null;
  maxMessagesPerDay?: number | null;
  maxWhatsappNumbers?: number | null;
  maxTemplates?: number | null;
  maxTeamSeats?: number | null;
};

function normalizeFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.map((f) => String(f).trim()).filter(Boolean);
}

export async function createBillingPlan(input: BillingPlanInput): Promise<BillingPlan> {
  await ensureBillingPlansSeeded();
  if (!input.name?.trim()) {
    throw new Error("Plan name is required");
  }
  if (!Number.isFinite(input.amountInr) || input.amountInr <= 0) {
    throw new Error("Plan amount must be a positive number");
  }
  const slugBase = input.slug?.trim() || slugifyPlanName(input.name);
  let slug = slugBase;
  let attempt = 1;
  while (await getBillingPlanBySlug(slug)) {
    attempt += 1;
    slug = `${slugBase}-${attempt}`.slice(0, 64);
  }

  if (input.featured) {
    await db.update(billingPlans).set({ featured: false, updatedAt: new Date() });
  }

  const values: InsertBillingPlan = {
    slug,
    name: input.name.trim(),
    tagline: (input.tagline ?? "").trim(),
    amountInr: Math.round(input.amountInr),
    period: input.period || "month",
    featured: !!input.featured,
    active: input.active !== false,
    razorpayEnabled: input.razorpayEnabled !== false,
    features: normalizeFeatures(input.features),
    sortOrder: input.sortOrder ?? 100,
    maxContacts: input.maxContacts ?? null,
    maxMessagesPerDay: input.maxMessagesPerDay ?? null,
    maxWhatsappNumbers: input.maxWhatsappNumbers ?? null,
    maxTemplates: input.maxTemplates ?? null,
    maxTeamSeats: input.maxTeamSeats ?? null,
  };

  const [row] = await db.insert(billingPlans).values(values).returning();
  return toBillingPlan(row);
}

export async function updateBillingPlan(
  id: string,
  input: Partial<BillingPlanInput> & { razorpayPlanId?: string | null },
): Promise<BillingPlan | undefined> {
  await ensureBillingPlansSeeded();
  const existing = await getBillingPlanById(id);
  if (!existing) return undefined;

  if (input.featured === true) {
    await db.update(billingPlans).set({ featured: false, updatedAt: new Date() });
  }

  const patch: Partial<BillingPlanRow> = { updatedAt: new Date() };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.tagline !== undefined) patch.tagline = input.tagline.trim();
  if (input.period !== undefined) patch.period = input.period;
  if (input.featured !== undefined) patch.featured = !!input.featured;
  if (input.active !== undefined) patch.active = !!input.active;
  if (input.razorpayEnabled !== undefined) patch.razorpayEnabled = !!input.razorpayEnabled;
  if (input.features !== undefined) patch.features = normalizeFeatures(input.features);
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.maxContacts !== undefined) patch.maxContacts = input.maxContacts;
  if (input.maxMessagesPerDay !== undefined) patch.maxMessagesPerDay = input.maxMessagesPerDay;
  if (input.maxWhatsappNumbers !== undefined) patch.maxWhatsappNumbers = input.maxWhatsappNumbers;
  if (input.maxTemplates !== undefined) patch.maxTemplates = input.maxTemplates;
  if (input.maxTeamSeats !== undefined) patch.maxTeamSeats = input.maxTeamSeats;
  if (input.razorpayPlanId !== undefined) patch.razorpayPlanId = input.razorpayPlanId;

  if (input.slug !== undefined) {
    const nextSlug = slugifyPlanName(input.slug);
    if (nextSlug !== existing.slug) {
      const clash = await getBillingPlanBySlug(nextSlug);
      if (clash && clash.id !== id) {
        throw new Error("A plan with this slug already exists");
      }
      patch.slug = nextSlug;
    }
  }

  if (input.amountInr !== undefined) {
    const nextAmount = Math.round(input.amountInr);
    if (nextAmount !== existing.amountInr) {
      patch.amountInr = nextAmount;
      // Price change invalidates the linked Razorpay plan — recreate on next checkout.
      patch.razorpayPlanId = null;
    }
  }

  const [row] = await db.update(billingPlans).set(patch).where(eq(billingPlans.id, id)).returning();
  return row ? toBillingPlan(row) : undefined;
}

export async function setBillingPlanRazorpayId(id: string, razorpayPlanId: string): Promise<void> {
  await db
    .update(billingPlans)
    .set({ razorpayPlanId, updatedAt: new Date() })
    .where(eq(billingPlans.id, id));
}

export async function clearBillingPlanRazorpayId(id: string): Promise<void> {
  await db
    .update(billingPlans)
    .set({ razorpayPlanId: null, updatedAt: new Date() })
    .where(eq(billingPlans.id, id));
}

export async function deleteBillingPlan(id: string): Promise<boolean> {
  // Soft-delete: hide from marketing/checkout but keep history for existing subscribers.
  const updated = await updateBillingPlan(id, { active: false, featured: false });
  return !!updated;
}

export function serializePlanForClient(plan: BillingPlan, { includeLimits = true } = {}) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline,
    priceLabel: plan.priceLabel,
    amountInr: plan.amountInr,
    period: plan.period,
    featured: plan.featured,
    active: plan.active,
    features: plan.features,
    razorpayEnabled: plan.razorpayEnabled,
    sortOrder: plan.sortOrder,
    ...(includeLimits
      ? {
          maxContacts: plan.maxContacts,
          maxMessagesPerDay: plan.maxMessagesPerDay,
          maxWhatsappNumbers: plan.maxWhatsappNumbers,
          maxTemplates: plan.maxTemplates,
          maxTeamSeats: plan.maxTeamSeats,
        }
      : {}),
  };
}
