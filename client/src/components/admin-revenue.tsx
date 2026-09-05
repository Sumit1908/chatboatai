import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  IndianRupee,
  TrendingUp,
  Users,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  UserX,
  Clock,
  Wallet,
  PieChart,
  AlertTriangle,
} from "lucide-react";

interface RevenueSnapshot {
  cards: {
    mrrInr: number;
    arrInr: number;
    totalRevenueInr: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueThisWeek: number;
    arpu: number;
    activePaid: number;
    trialUsers: number;
    freeAccess: number;
    cancelled: number;
    inactive: number;
    expired: number;
    totalUsers: number;
    trialToPaidPct: number;
    churnPct: number;
    upgrades: number;
    renewals: number;
    initialSubscriptions: number;
    failedPayments: number;
    capturedPayments: number;
    activePlans: number;
  };
  planBreakdown: Array<{
    id: string;
    name: string;
    slug: string;
    priceLabel: string;
    amountInr: number;
    activeSubscribers: number;
    mrrInr: number;
    paymentsCount: number;
    revenueInr: number;
  }>;
  expiringSoon: Array<{
    id: string;
    email: string | null;
    name: string | null;
    planName: string | null;
    priceLabel: string | null;
    subscriptionEndsAt: string | null;
  }>;
  recentSubscribers: Array<{
    id: string;
    email: string | null;
    name: string | null;
    planName: string | null;
    priceLabel: string | null;
    subscriptionEndsAt: string | null;
    updatedAt: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    type: string;
    status: string;
    amountLabel: string;
    email: string | null;
    description: string | null;
    plan: { name: string } | null;
    createdAt: string | null;
  }>;
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: typeof IndianRupee;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-cyan-600 shrink-0" />
      </CardHeader>
      <CardContent>
        <div className="font-heading text-2xl font-bold text-[#14205a]">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function AdminRevenuePanel() {
  const { data, isLoading, isFetching, refetch } = useQuery<RevenueSnapshot>({
    queryKey: ["/api/admin/revenue"],
    refetchInterval: 30000,
  });

  const c = data?.cards;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Subscriptions & Revenue</h1>
          <p className="text-sm text-muted-foreground">
            Live MRR, plan mix, payments, churn, and subscribers
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading || !c ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Loading revenue dashboard…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="MRR" value={inr(c.mrrInr)} hint="Monthly recurring revenue" icon={IndianRupee} />
            <MetricCard title="ARR" value={inr(c.arrInr)} hint="Annualized from MRR" icon={TrendingUp} />
            <MetricCard title="Total revenue" value={inr(c.totalRevenueInr)} hint="All captured payments" icon={Wallet} />
            <MetricCard title="ARPU" value={inr(c.arpu)} hint="Avg revenue per paid user" icon={PieChart} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="This month" value={inr(c.revenueThisMonth)} icon={IndianRupee} />
            <MetricCard title="Last month" value={inr(c.revenueLastMonth)} icon={IndianRupee} />
            <MetricCard title="This week" value={inr(c.revenueThisWeek)} icon={IndianRupee} />
            <MetricCard title="Captured payments" value={c.capturedPayments} hint={`${c.failedPayments} failed`} icon={CreditCard} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Active paid" value={c.activePaid} icon={Users} />
            <MetricCard title="On trial" value={c.trialUsers} icon={Clock} />
            <MetricCard title="Free access" value={c.freeAccess} icon={Users} />
            <MetricCard title="Cancelled / expired" value={c.cancelled} hint={`${c.expired} expired entitlements`} icon={UserX} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Inactive" value={c.inactive} icon={UserX} />
            <MetricCard title="Trial → paid" value={`${c.trialToPaidPct}%`} hint={`${c.activePaid} of ${c.totalUsers} users`} icon={TrendingUp} />
            <MetricCard title="Churn" value={`${c.churnPct}%`} icon={AlertTriangle} />
            <MetricCard title="Active catalog plans" value={c.activePlans} icon={CreditCard} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard title="New subscriptions" value={c.initialSubscriptions} icon={CreditCard} />
            <MetricCard title="Upgrades" value={c.upgrades} icon={ArrowUpRight} />
            <MetricCard title="Renewals" value={c.renewals} icon={RefreshCw} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Active subs</TableHead>
                      <TableHead>MRR</TableHead>
                      <TableHead>Payments</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.planBreakdown ?? []).map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{plan.priceLabel}</TableCell>
                        <TableCell>{plan.activeSubscribers}</TableCell>
                        <TableCell>{inr(plan.mrrInr)}</TableCell>
                        <TableCell>{plan.paymentsCount}</TableCell>
                        <TableCell>{inr(plan.revenueInr)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expiring in 7 days</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.expiringSoon ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subscriptions expiring this week.</p>
                ) : (
                  <div className="space-y-3">
                    {data!.expiringSoon.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-3 text-sm border-b border-[#14205a]/5 pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </div>
                        <div className="text-right">
                          <p>{row.planName} · {row.priceLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.subscriptionEndsAt
                              ? new Date(row.subscriptionEndsAt).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent paid subscribers</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.recentSubscribers ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paid subscribers yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data!.recentSubscribers.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-3 text-sm border-b border-[#14205a]/5 pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{row.planName || "—"}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{row.priceLabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent payments</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.recentPayments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.recentPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="capitalize">{p.type}</TableCell>
                          <TableCell>{p.plan?.name || "—"}</TableCell>
                          <TableCell className="font-medium">{p.amountLabel}</TableCell>
                          <TableCell>
                            <Badge
                              variant={p.status === "captured" ? "secondary" : "destructive"}
                              className={
                                p.status === "captured"
                                  ? "bg-[#25D366]/15 text-[#075E54] border-[#25D366]/30"
                                  : undefined
                              }
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{p.email || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
