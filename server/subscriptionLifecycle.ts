import type { User } from "@shared/models/auth";
import { authStorage } from "./auth/storage";
import { getBillingPlanById } from "./billingPlans";
import { db } from "@db";
import { sql } from "drizzle-orm";

let columnReady = false;

export async function ensureSubscriptionEndsAtColumn(): Promise<void> {
  if (columnReady) return;
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp
  `);
  columnReady = true;
}

export function addMonths(from: Date, months = 1): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function endsAtFromRazorpay(currentEnd?: number | null): Date {
  if (currentEnd && Number.isFinite(currentEnd) && currentEnd > 0) {
    // Razorpay uses unix seconds
    const ms = currentEnd > 1e12 ? currentEnd : currentEnd * 1000;
    return new Date(ms);
  }
  return addMonths(new Date(), 1);
}

/** Activate or renew a paid plan after successful payment. */
export async function activatePaidPlan(params: {
  userId: string;
  billingPlanId: string;
  razorpaySubscriptionId?: string | null;
  subscriptionEndsAt?: Date | null;
  razorpayCurrentEnd?: number | null;
}): Promise<User | undefined> {
  await ensureSubscriptionEndsAtColumn();
  const plan = await getBillingPlanById(params.billingPlanId);
  if (!plan) {
    throw new Error("Billing plan not found");
  }

  const endsAt =
    params.subscriptionEndsAt ||
    endsAtFromRazorpay(params.razorpayCurrentEnd ?? null);

  const updates: Partial<User> = {
    hasPaid: true,
    subscriptionStatus: "active",
    billingPlanId: plan.id,
    subscriptionEndsAt: endsAt,
  };
  if (params.razorpaySubscriptionId) {
    updates.razorpaySubscriptionId = params.razorpaySubscriptionId;
  }

  return authStorage.updateUserSubscription(params.userId, updates);
}

/**
 * Expire a paid plan: clear entitlements so limits become zero / blocked.
 * User cannot perform gated actions until they subscribe again.
 */
export async function expirePaidPlan(userId: string): Promise<User | undefined> {
  await ensureSubscriptionEndsAtColumn();
  return authStorage.updateUserSubscription(userId, {
    hasPaid: false,
    subscriptionStatus: "cancelled",
    billingPlanId: null,
    subscriptionEndsAt: null,
  });
}

/** If the paid period has ended, expire entitlements (lazy expiry on access). */
export async function ensureSubscriptionFresh(user: User): Promise<User> {
  await ensureSubscriptionEndsAtColumn();

  if (user.role === "super_admin" || user.grantedFreeAccess) {
    return user;
  }

  if (
    user.hasPaid &&
    user.subscriptionStatus === "active" &&
    user.subscriptionEndsAt &&
    new Date(user.subscriptionEndsAt) <= new Date()
  ) {
    const expired = await expirePaidPlan(user.id);
    return expired || { ...user, hasPaid: false, subscriptionStatus: "cancelled", billingPlanId: null, subscriptionEndsAt: null };
  }

  return user;
}

export function isPaidPeriodActive(user: User): boolean {
  if (!(user.hasPaid && user.subscriptionStatus === "active")) return false;
  if (!user.subscriptionEndsAt) return true; // legacy rows without end date
  return new Date(user.subscriptionEndsAt) > new Date();
}
