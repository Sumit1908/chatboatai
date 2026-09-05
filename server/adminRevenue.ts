import { authStorage } from "./auth/storage";
import { listAllBillingPlans } from "./billingPlans";
import { listAllPayments, ensureBillingPaymentsTable } from "./billingPayments";
import { ensureSubscriptionEndsAtColumn, isPaidPeriodActive } from "./subscriptionLifecycle";

function startOfMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfPrevMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
}

function endOfPrevMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0, 23, 59, 59, 999));
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function getAdminRevenueSnapshot() {
  await ensureSubscriptionEndsAtColumn();
  await ensureBillingPaymentsTable();

  const [allUsers, plans, payments] = await Promise.all([
    authStorage.getAllUsers(),
    listAllBillingPlans(),
    listAllPayments(500),
  ]);

  const planById = new Map(plans.map((p) => [p.id, p]));
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = startOfPrevMonth(now);
  const prevMonthEnd = endOfPrevMonth(now);
  const weekAgo = daysAgo(7);
  const inSevenDays = new Date();
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const paidActive = allUsers.filter(
    (u) => u.role !== "super_admin" && isPaidPeriodActive(u) && !u.grantedFreeAccess,
  );
  const freeAccess = allUsers.filter((u) => u.grantedFreeAccess);
  const trialUsers = allUsers.filter((u) => u.subscriptionStatus === "trial");
  const cancelled = allUsers.filter((u) => u.subscriptionStatus === "cancelled");
  const inactive = allUsers.filter(
    (u) => u.subscriptionStatus === "inactive" && !u.grantedFreeAccess && !u.hasPaid,
  );
  const expiredPaid = allUsers.filter(
    (u) =>
      u.subscriptionStatus === "cancelled" &&
      !u.hasPaid &&
      !u.grantedFreeAccess,
  );

  const mrrInr = paidActive.reduce(
    (sum, u) => sum + (u.billingPlanId ? planById.get(u.billingPlanId)?.amountInr ?? 0 : 0),
    0,
  );

  const captured = payments.filter((p) => p.status === "captured");
  const failed = payments.filter((p) => p.status === "failed");
  const upgrades = captured.filter((p) => p.type === "upgrade");
  const renewals = captured.filter((p) => p.type === "renewal");
  const initialSubs = captured.filter((p) => p.type === "subscription");

  const totalRevenueInr = captured.reduce((s, p) => s + p.amountInr, 0);
  const revenueThisMonth = captured
    .filter((p) => p.createdAt && new Date(p.createdAt) >= thisMonthStart)
    .reduce((s, p) => s + p.amountInr, 0);
  const revenueLastMonth = captured
    .filter(
      (p) =>
        p.createdAt &&
        new Date(p.createdAt) >= prevMonthStart &&
        new Date(p.createdAt) <= prevMonthEnd,
    )
    .reduce((s, p) => s + p.amountInr, 0);
  const revenueThisWeek = captured
    .filter((p) => p.createdAt && new Date(p.createdAt) >= weekAgo)
    .reduce((s, p) => s + p.amountInr, 0);

  const planBreakdown = plans.map((plan) => {
    const subscribers = paidActive.filter((u) => u.billingPlanId === plan.id);
    const planPayments = captured.filter((p) => p.plan?.id === plan.id);
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      priceLabel: plan.priceLabel,
      amountInr: plan.amountInr,
      activeSubscribers: subscribers.length,
      mrrInr: subscribers.length * plan.amountInr,
      paymentsCount: planPayments.length,
      revenueInr: planPayments.reduce((s, p) => s + p.amountInr, 0),
    };
  });

  const totalUsers = allUsers.filter((u) => u.role !== "super_admin").length;
  const trialToPaidPct =
    totalUsers > 0 ? Math.round((paidActive.length / totalUsers) * 100) : 0;
  const arpu = paidActive.length > 0 ? Math.round(mrrInr / paidActive.length) : 0;
  const churnDenom = paidActive.length + cancelled.length;
  const churnPct = churnDenom > 0 ? Math.round((cancelled.length / churnDenom) * 100) : 0;

  const expiringSoon = paidActive
    .filter(
      (u) =>
        u.subscriptionEndsAt &&
        new Date(u.subscriptionEndsAt) > now &&
        new Date(u.subscriptionEndsAt) <= inSevenDays,
    )
    .map((u) => {
      const plan = u.billingPlanId ? planById.get(u.billingPlanId) : undefined;
      return {
        id: u.id,
        email: u.email,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        planName: plan?.name ?? null,
        priceLabel: plan?.priceLabel ?? null,
        subscriptionEndsAt: u.subscriptionEndsAt,
      };
    })
    .sort(
      (a, b) =>
        new Date(a.subscriptionEndsAt || 0).getTime() -
        new Date(b.subscriptionEndsAt || 0).getTime(),
    )
    .slice(0, 20);

  const recentSubscribers = paidActive
    .slice()
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 15)
    .map((u) => {
      const plan = u.billingPlanId ? planById.get(u.billingPlanId) : undefined;
      return {
        id: u.id,
        email: u.email,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        planName: plan?.name ?? null,
        priceLabel: plan?.priceLabel ?? null,
        subscriptionEndsAt: u.subscriptionEndsAt,
        updatedAt: u.updatedAt,
      };
    });

  return {
    cards: {
      mrrInr,
      arrInr: mrrInr * 12,
      totalRevenueInr,
      revenueThisMonth,
      revenueLastMonth,
      revenueThisWeek,
      arpu,
      activePaid: paidActive.length,
      trialUsers: trialUsers.length,
      freeAccess: freeAccess.length,
      cancelled: cancelled.length,
      inactive: inactive.length,
      expired: expiredPaid.length,
      totalUsers,
      trialToPaidPct,
      churnPct,
      upgrades: upgrades.length,
      renewals: renewals.length,
      initialSubscriptions: initialSubs.length,
      failedPayments: failed.length,
      capturedPayments: captured.length,
      activePlans: plans.filter((p) => p.active).length,
    },
    planBreakdown,
    expiringSoon,
    recentSubscribers,
    recentPayments: payments.slice(0, 20),
  };
}
