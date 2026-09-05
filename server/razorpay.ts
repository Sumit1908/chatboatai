import Razorpay from "razorpay";
import crypto from "crypto";
import type { BillingPlan } from "@shared/billingPlans";
import { calculateProRataUpgrade } from "@shared/upgradePricing";
import {
  getBillingPlanById,
  getDefaultBillingPlan,
  setBillingPlanRazorpayId,
  clearBillingPlanRazorpayId,
} from "./billingPlans";

let client: Razorpay | null = null;

function getClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim().replace(/^["']|["']$/g, "");
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/^["']|["']$/g, "");
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }
  if (!client) {
    client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return client;
}

function safeCompareHex(expected: string, actual: string | undefined): boolean {
  if (!actual || expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(actual, "utf8"));
}

function razorpayPlanName(plan: BillingPlan): string {
  return `ChatBoatAI ${plan.name} — ${plan.priceLabel}/month`;
}

/** Finds or creates the Razorpay plan for a billing tier. */
export async function getOrCreatePlanId(billingPlanId: string): Promise<string> {
  const plan = await getBillingPlanById(billingPlanId);
  if (!plan) {
    throw new Error(`Unknown billing plan: ${billingPlanId}`);
  }
  if (!plan.active) {
    throw new Error(`Plan "${plan.name}" is not available`);
  }
  if (!plan.razorpayEnabled) {
    throw new Error(`Plan "${plan.name}" is not available for self-serve checkout`);
  }

  if (plan.razorpayPlanId) {
    return plan.razorpayPlanId;
  }

  const amountPaise = plan.amountInr * 100;
  const planName = razorpayPlanName(plan);
  const razorpay = getClient();
  const existing = await razorpay.plans.all({ count: 100 });
  const match = existing.items.find(
    (p: any) => p.item?.name === planName && Number(p.item?.amount) === amountPaise,
  );

  if (match) {
    await setBillingPlanRazorpayId(plan.id, match.id);
    return match.id;
  }

  const created = await razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: planName,
      amount: amountPaise,
      currency: "INR",
      description: `${plan.name} plan — ${plan.tagline}`,
    },
  } as Parameters<Razorpay["plans"]["create"]>[0]);

  await setBillingPlanRazorpayId(plan.id, created.id);
  return created.id;
}

export async function createSubscription(
  customerEmail: string,
  customerName: string,
  billingPlanId?: string,
) {
  const plan =
    (billingPlanId ? await getBillingPlanById(billingPlanId) : undefined) ||
    (await getDefaultBillingPlan());

  if (!plan) {
    throw new Error("No billing plans are configured");
  }
  if (!plan.active || !plan.razorpayEnabled) {
    throw new Error("This plan requires contacting sales");
  }

  const razorpay = getClient();
  const billingPlanRowId = plan.id;
  let planId = await getOrCreatePlanId(billingPlanRowId);

  async function create(planIdToUse: string) {
    return await razorpay.subscriptions.create({
      plan_id: planIdToUse,
      customer_notify: 1,
      total_count: 120,
      notes: {
        email: customerEmail,
        name: customerName,
        billingPlanId: billingPlanRowId,
      },
    } as Parameters<Razorpay["subscriptions"]["create"]>[0]);
  }

  let subscription: Awaited<ReturnType<typeof create>>;
  try {
    subscription = await create(planId);
  } catch (error: any) {
    const razorError = error?.error;
    const isBadRequestIdNotFound =
      error?.statusCode === 400 &&
      razorError?.code === "BAD_REQUEST_ERROR" &&
      typeof razorError?.description === "string" &&
      razorError.description.toLowerCase().includes("invalid");

    // If the saved Razorpay plan id doesn’t exist in the current Razorpay mode/account,
    // clear it, recreate, and retry once.
    if (isBadRequestIdNotFound) {
      await clearBillingPlanRazorpayId(billingPlanRowId);
      planId = await getOrCreatePlanId(billingPlanRowId);
      subscription = await create(planId);
    } else {
      throw error;
    }
  }

  return { subscription, plan };
}

export type UpgradeQuote = {
  fromPlan: BillingPlan;
  toPlan: BillingPlan;
  /** Amount charged at checkout (pro-rata payable). */
  differenceInr: number;
  differencePaise: number;
  remainingCreditInr: number;
  usedValueInr: number;
  daysUsed: number;
  daysRemaining: number;
  totalDays: number;
  usesProRata: boolean;
};

export async function quotePlanUpgrade(
  currentPlanId: string,
  targetPlanId: string,
  subscriptionEndsAt?: Date | string | null,
): Promise<UpgradeQuote> {
  const fromPlan = await getBillingPlanById(currentPlanId);
  const toPlan = await getBillingPlanById(targetPlanId);
  if (!fromPlan || !toPlan) {
    throw new Error("Plan not found");
  }
  if (!toPlan.active || !toPlan.razorpayEnabled) {
    throw new Error("Target plan is not available for upgrade");
  }
  if (toPlan.amountInr <= fromPlan.amountInr) {
    throw new Error("You can only upgrade to a higher-priced plan");
  }

  const breakdown = calculateProRataUpgrade({
    fromPlanAmountInr: fromPlan.amountInr,
    toPlanAmountInr: toPlan.amountInr,
    subscriptionEndsAt,
  });

  return {
    fromPlan,
    toPlan,
    differenceInr: breakdown.payableInr,
    differencePaise: breakdown.payableInr * 100,
    remainingCreditInr: breakdown.remainingCreditInr,
    usedValueInr: breakdown.usedValueInr,
    daysUsed: breakdown.daysUsed,
    daysRemaining: breakdown.daysRemaining,
    totalDays: breakdown.totalDays,
    usesProRata: breakdown.usesProRata,
  };
}

/** One-time order for the pro-rata upgrade amount. */
export async function createUpgradeOrder(params: {
  userId: string;
  customerEmail: string;
  customerName: string;
  currentPlanId: string;
  targetPlanId: string;
  subscriptionEndsAt?: Date | string | null;
}) {
  const quote = await quotePlanUpgrade(
    params.currentPlanId,
    params.targetPlanId,
    params.subscriptionEndsAt,
  );
  const razorpay = getClient();
  const order = await razorpay.orders.create({
    amount: quote.differencePaise,
    currency: "INR",
    receipt: `upgrade_${params.userId.slice(0, 8)}_${Date.now()}`.slice(0, 40),
    notes: {
      type: "plan_upgrade",
      userId: params.userId,
      fromPlanId: quote.fromPlan.id,
      toPlanId: quote.toPlan.id,
      payableInr: String(quote.differenceInr),
      creditInr: String(quote.remainingCreditInr),
      email: params.customerEmail,
      name: params.customerName,
    },
  });

  return { order, quote };
}

export async function applyPlanUpgrade(params: {
  userId: string;
  razorpaySubscriptionId: string | null | undefined;
  fromPlanId: string;
  toPlanId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  subscriptionEndsAt?: Date | string | null;
}) {
  if (!verifyPaymentSignature(params.orderId, params.paymentId, params.signature)) {
    throw new Error("Invalid payment signature");
  }

  const quote = await quotePlanUpgrade(
    params.fromPlanId,
    params.toPlanId,
    params.subscriptionEndsAt,
  );
  const newRazorpayPlanId = await getOrCreatePlanId(quote.toPlan.id);

  if (params.razorpaySubscriptionId) {
    try {
      const razorpay = getClient();
      await razorpay.subscriptions.update(params.razorpaySubscriptionId, {
        plan_id: newRazorpayPlanId,
        schedule_change_at: "now",
      } as any);
    } catch (error) {
      console.error("[Razorpay] Failed to update subscription plan after upgrade:", error);
      // Local upgrade still applies — recurring plan change can be retried later.
    }
  }

  return quote;
}

/** Razorpay returns 401 for both bad keys and missing Subscriptions product access. */
export async function describeUnauthorizedError(): Promise<string> {
  try {
    const razorpay = getClient();
    await razorpay.payments.all({ count: 1 });
    return (
      "Razorpay Subscriptions is not enabled on your account. In the Razorpay Dashboard (Test mode), go to Payment Products → Subscriptions, activate it, enable Card under Settings, then try checkout again."
    );
  } catch {
    return (
      "Razorpay API authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET match your Test mode keys in the Razorpay dashboard, then restart the server."
    );
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature?.trim()) {
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompareHex(expected, signature.trim());
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string | undefined,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/^["']|["']$/g, "");
  if (!secret || !signature?.trim()) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeCompareHex(expected, signature.trim());
}

/** Subscription checkout signs payment_id|subscription_id */
export function verifySubscriptionPaymentSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string | undefined,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/^["']|["']$/g, "");
  if (!secret || !signature?.trim()) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return safeCompareHex(expected, signature.trim());
}
