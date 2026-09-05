import { db } from "@db";
import { billingPayments, type InsertBillingPayment, type BillingPayment } from "@shared/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getBillingPlanById } from "./billingPlans";

let tableReady = false;

export async function ensureBillingPaymentsTable(): Promise<void> {
  if (tableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS billing_payments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      billing_plan_id varchar,
      from_plan_id varchar,
      type varchar(40) NOT NULL,
      status varchar(40) NOT NULL DEFAULT 'captured',
      amount_inr integer NOT NULL DEFAULT 0,
      currency varchar(10) NOT NULL DEFAULT 'INR',
      razorpay_payment_id varchar,
      razorpay_order_id varchar,
      razorpay_subscription_id varchar,
      razorpay_invoice_id varchar,
      method varchar(40),
      email varchar,
      description text,
      raw_payload jsonb,
      created_at timestamp DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS billing_payments_user_idx
    ON billing_payments (user_id, created_at)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS billing_payments_payment_id_idx
    ON billing_payments (razorpay_payment_id)
  `);
  tableReady = true;
}

export type RecordPaymentInput = {
  userId: string;
  billingPlanId?: string | null;
  fromPlanId?: string | null;
  type: "subscription" | "upgrade" | "renewal" | "refund" | "failed";
  status?: "captured" | "failed" | "refunded";
  amountInr: number;
  currency?: string;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  razorpaySubscriptionId?: string | null;
  razorpayInvoiceId?: string | null;
  method?: string | null;
  email?: string | null;
  description?: string | null;
  rawPayload?: unknown;
};

/** Idempotent insert — skips if the same razorpayPaymentId already exists. */
export async function recordBillingPayment(input: RecordPaymentInput): Promise<BillingPayment> {
  await ensureBillingPaymentsTable();

  if (input.razorpayPaymentId) {
    const [existing] = await db
      .select()
      .from(billingPayments)
      .where(eq(billingPayments.razorpayPaymentId, input.razorpayPaymentId))
      .limit(1);
    if (existing) return existing;
  }

  const values: InsertBillingPayment = {
    userId: input.userId,
    billingPlanId: input.billingPlanId ?? null,
    fromPlanId: input.fromPlanId ?? null,
    type: input.type,
    status: input.status || "captured",
    amountInr: Math.max(0, Math.round(input.amountInr)),
    currency: input.currency || "INR",
    razorpayPaymentId: input.razorpayPaymentId ?? null,
    razorpayOrderId: input.razorpayOrderId ?? null,
    razorpaySubscriptionId: input.razorpaySubscriptionId ?? null,
    razorpayInvoiceId: input.razorpayInvoiceId ?? null,
    method: input.method ?? null,
    email: input.email ?? null,
    description: input.description ?? null,
    rawPayload: input.rawPayload ?? null,
  };

  const [row] = await db.insert(billingPayments).values(values).returning();
  return row;
}

async function serializePayment(row: BillingPayment) {
  const plan = row.billingPlanId ? await getBillingPlanById(row.billingPlanId) : undefined;
  const fromPlan = row.fromPlanId ? await getBillingPlanById(row.fromPlanId) : undefined;
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    status: row.status,
    amountInr: row.amountInr,
    amountLabel: `₹${row.amountInr.toLocaleString("en-IN")}`,
    currency: row.currency,
    razorpayPaymentId: row.razorpayPaymentId,
    razorpayOrderId: row.razorpayOrderId,
    razorpaySubscriptionId: row.razorpaySubscriptionId,
    razorpayInvoiceId: row.razorpayInvoiceId,
    method: row.method,
    email: row.email,
    description: row.description,
    plan: plan
      ? { id: plan.id, name: plan.name, priceLabel: plan.priceLabel, slug: plan.slug }
      : null,
    fromPlan: fromPlan
      ? { id: fromPlan.id, name: fromPlan.name, priceLabel: fromPlan.priceLabel, slug: fromPlan.slug }
      : null,
    createdAt: row.createdAt,
  };
}

export async function listPaymentsForUser(userId: string, limit = 50) {
  await ensureBillingPaymentsTable();
  const rows = await db
    .select()
    .from(billingPayments)
    .where(eq(billingPayments.userId, userId))
    .orderBy(desc(billingPayments.createdAt))
    .limit(limit);
  return Promise.all(rows.map(serializePayment));
}

export async function listAllPayments(limit = 200) {
  await ensureBillingPaymentsTable();
  const rows = await db
    .select()
    .from(billingPayments)
    .orderBy(desc(billingPayments.createdAt))
    .limit(limit);
  return Promise.all(rows.map(serializePayment));
}

export async function getPaymentByIdForUser(
  paymentId: string,
  userId: string,
): Promise<BillingPayment | undefined> {
  await ensureBillingPaymentsTable();
  const [row] = await db
    .select()
    .from(billingPayments)
    .where(and(eq(billingPayments.id, paymentId), eq(billingPayments.userId, userId)))
    .limit(1);
  return row;
}

export async function getPaymentByRazorpayId(paymentId: string) {
  await ensureBillingPaymentsTable();
  const [row] = await db
    .select()
    .from(billingPayments)
    .where(eq(billingPayments.razorpayPaymentId, paymentId))
    .limit(1);
  return row;
}

export function paiseToInr(amountPaise: number | string | undefined | null): number {
  const n = Number(amountPaise);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 100);
}
