const MS_PER_DAY = 86_400_000;
/** Paid plans bill on a 30-day cycle for pro-rata credit. */
export const SUBSCRIPTION_PERIOD_DAYS = 30;

export function addMonths(from: Date, months = 1): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function diffDays(start: Date, end: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
}

export type ProRataUpgradeBreakdown = {
  totalDays: number;
  daysUsed: number;
  daysRemaining: number;
  usedValueInr: number;
  remainingCreditInr: number;
  payableInr: number;
  periodStart: Date;
  periodEnd: Date;
  usesProRata: boolean;
};

/** Pro-rata upgrade: new plan price minus unused value of the current plan. */
export function calculateProRataUpgrade(params: {
  fromPlanAmountInr: number;
  toPlanAmountInr: number;
  subscriptionEndsAt: Date | string | null | undefined;
  asOf?: Date;
}): ProRataUpgradeBreakdown {
  const asOf = params.asOf ?? new Date();
  const fromAmount = params.fromPlanAmountInr;
  const toAmount = params.toPlanAmountInr;

  const fallback = (): ProRataUpgradeBreakdown => {
    const payableInr = Math.max(1, toAmount - fromAmount);
    return {
      totalDays: 30,
      daysUsed: 30,
      daysRemaining: 0,
      usedValueInr: fromAmount,
      remainingCreditInr: 0,
      payableInr,
      periodStart: addMonths(asOf, -1),
      periodEnd: asOf,
      usesProRata: false,
    };
  };

  if (!params.subscriptionEndsAt) {
    return fallback();
  }

  const periodEnd = new Date(params.subscriptionEndsAt);
  if (Number.isNaN(periodEnd.getTime()) || periodEnd <= asOf) {
    return fallback();
  }

  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - SUBSCRIPTION_PERIOD_DAYS);
  const totalDays = SUBSCRIPTION_PERIOD_DAYS;
  const daysUsed = Math.min(totalDays, diffDays(periodStart, asOf));
  const daysRemaining = Math.max(0, totalDays - daysUsed);

  const usedValueInr = Math.round((fromAmount * daysUsed) / totalDays);
  const remainingCreditInr = fromAmount - usedValueInr;
  const payableInr = Math.max(1, toAmount - remainingCreditInr);

  return {
    totalDays,
    daysUsed,
    daysRemaining,
    usedValueInr,
    remainingCreditInr,
    payableInr,
    periodStart,
    periodEnd,
    usesProRata: true,
  };
}
