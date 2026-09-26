import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  Handshake,
  IndianRupee,
  Mail,
  Minus,
  Phone,
  Plus,
  RotateCcw,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { LEAD_SOURCE_LABELS, type CrmDashboardSummary, type TaskType } from "@shared/crm";
import { INTEGRATIONS, IntegrationIcon } from "@/components/crm/brand";
import {
  ComingSoonBadge,
  LeadFormDialog,
  LeadStatusBadge,
  QueryError,
  STAGE_BAR_COLOR,
  TaskFormDialog,
  formatChange,
  formatDue,
  formatInr,
} from "@/components/crm/crm-ui";

const TASK_ICON: Record<TaskType, LucideIcon> = {
  call: Phone,
  meeting: CalendarDays,
  follow_up: RotateCcw,
  email: Mail,
  task: CalendarClock,
};

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Panel({
  title,
  href,
  action,
  children,
  className = "",
}: {
  title: string;
  href?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
        {action ??
          (href && (
            <Link href={href} className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          ))}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  change,
  hint,
  icon: Icon,
  testId,
}: {
  label: string;
  value: string;
  change?: number | null;
  hint?: string;
  icon: LucideIcon;
  testId: string;
}) {
  const c = change === undefined ? null : formatChange(change);
  const ChangeIcon = c?.tone === "up" ? ArrowUpRight : c?.tone === "down" ? ArrowDownRight : Minus;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm" data-testid={testId}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-heading text-2xl font-bold text-foreground" data-testid={`${testId}-value`}>
        {value}
      </p>
      {c ? (
        <p
          className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            c.tone === "up" ? "text-emerald-600" : c.tone === "down" ? "text-rose-600" : "text-muted-foreground"
          }`}
        >
          <ChangeIcon className="h-3.5 w-3.5" aria-hidden />
          {c.label}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[118px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-64 rounded-xl lg:col-span-3" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}

export default function CrmDashboard() {
  const { user } = useAuth();
  const [leadOpen, setLeadOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const { data, isLoading, error } = useQuery<CrmDashboardSummary>({
    queryKey: ["/api/crm/dashboard"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const firstName = user?.firstName?.trim();
  const maxStage = Math.max(1, ...(data?.pipeline.map((p) => p.count) ?? [0]));
  const pipelineTotal = data?.pipeline.reduce((sum, p) => sum + p.count, 0) ?? 0;
  const isEmpty = data && data.totalLeads === 0 && pipelineTotal === 0 && data.upcomingFollowUps.length === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground" data-testid="text-greeting">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTaskOpen(true)} data-testid="button-dashboard-add-followup">
            <CalendarClock className="mr-2 h-4 w-4" aria-hidden /> Schedule follow-up
          </Button>
          <Button onClick={() => setLeadOpen(true)} data-testid="button-dashboard-add-lead">
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Add lead
          </Button>
        </div>
      </div>

      {error ? (
        <QueryError error={error} />
      ) : isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          {isEmpty && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-medium">Your CRM is ready.</p>
              <p className="mt-0.5 text-muted-foreground">
                Add your first lead, create a deal in the pipeline or schedule a follow-up — these numbers update as
                you work.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric
              label="Total Leads"
              value={data.totalLeads.toLocaleString("en-IN")}
              change={data.leadsChangePct}
              icon={Users}
              testId="metric-total-leads"
            />
            <Metric
              label="Active Deals"
              value={data.activeDeals.toLocaleString("en-IN")}
              hint={`${formatInr(data.activeDealsValueInr)} open pipeline`}
              icon={Handshake}
              testId="metric-active-deals"
            />
            <Metric
              label="Won This Month"
              value={data.wonThisMonth.toLocaleString("en-IN")}
              change={data.wonChangePct}
              icon={Trophy}
              testId="metric-won-month"
            />
            <Metric
              label="Revenue"
              value={formatInr(data.revenueThisMonthInr)}
              change={data.revenueChangePct}
              icon={IndianRupee}
              testId="metric-revenue"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel title="Sales Pipeline" href="/pipeline" className="lg:col-span-3">
              {pipelineTotal === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No deals yet.{" "}
                  <Link href="/deals" className="font-medium text-primary hover:underline">
                    Add a deal
                  </Link>{" "}
                  to see your pipeline.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.pipeline.map((p) => (
                    <li key={p.stage} className="flex items-center gap-3 text-sm" data-testid={`pipeline-${p.stage}`}>
                      <span className="w-24 shrink-0 text-muted-foreground">{p.label}</span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full transition-all duration-500"
                          style={{ width: `${(p.count / maxStage) * 100}%`, backgroundColor: STAGE_BAR_COLOR[p.stage] }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right font-semibold text-foreground">{p.count}</span>
                      <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
                        {formatInr(p.valueInr)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Upcoming Follow-ups" href="/follow-ups" className="lg:col-span-2">
              {data.upcomingFollowUps.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing scheduled.{" "}
                  <button type="button" className="font-medium text-primary hover:underline" onClick={() => setTaskOpen(true)}>
                    Schedule a follow-up
                  </button>
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.upcomingFollowUps.map((f) => {
                    const Icon = TASK_ICON[f.type] ?? RotateCcw;
                    return (
                      <li key={f.id} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {f.leadName ?? f.title}
                          </span>
                          <span className={`block truncate text-xs ${f.overdue ? "font-medium text-rose-600" : "text-muted-foreground"}`}>
                            {f.leadName ? `${f.title} · ` : ""}
                            {f.overdue ? "Overdue · " : ""}
                            {formatDue(f.dueAt)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel title="Recent Leads" href="/leads" className="lg:col-span-3">
              {data.recentLeads.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No leads yet.{" "}
                  <button type="button" className="font-medium text-primary hover:underline" onClick={() => setLeadOpen(true)}>
                    Add your first lead
                  </button>
                </p>
              ) : (
                <div className="-mx-1 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-1 pb-2 font-medium">Name</th>
                        <th className="px-1 pb-2 font-medium">Source</th>
                        <th className="px-1 pb-2 font-medium">Status</th>
                        <th className="px-1 pb-2 font-medium">Next Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.recentLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td className="px-1 py-2.5 font-medium text-foreground">{lead.name}</td>
                          <td className="px-1 py-2.5 text-muted-foreground">{LEAD_SOURCE_LABELS[lead.source] ?? lead.source}</td>
                          <td className="px-1 py-2.5">
                            <LeadStatusBadge status={lead.status} />
                          </td>
                          <td className="px-1 py-2.5 text-muted-foreground">{lead.nextAction ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Integrations" href="/connected-apps" className="lg:col-span-2">
              <ul className="grid grid-cols-3 gap-2">
                {data.integrations.slice(0, 8).map((integration) => {
                  const meta = INTEGRATIONS.find((i) => i.id === integration.id);
                  return (
                    <li
                      key={integration.id}
                      className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 px-1 py-2.5 text-center"
                      title={`${integration.name}: ${integration.detail}`}
                    >
                      {meta && <IntegrationIcon integration={meta} className="h-8 w-8" />}
                      <span className="w-full truncate text-[11px] font-medium text-foreground">{integration.name}</span>
                      {integration.status === "connected" ? (
                        <span className="text-[10px] font-medium text-emerald-600">Connected</span>
                      ) : integration.status === "available" ? (
                        <span className="text-[10px] font-medium text-primary">Not connected</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Coming soon</span>
                      )}
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/connected-apps"
                    className="flex h-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-1 py-2.5 text-center text-primary transition-colors hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    <span className="text-[11px] font-semibold leading-tight">Connect Integration</span>
                  </Link>
                </li>
              </ul>
            </Panel>
          </div>

          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" aria-hidden /> Revenue is the value of deals marked Closed Won this month (IST).
            <span className="inline-flex items-center gap-1.5">
              AI insights <ComingSoonBadge />
            </span>
          </p>
        </>
      )}

      <LeadFormDialog open={leadOpen} onOpenChange={setLeadOpen} />
      <TaskFormDialog open={taskOpen} onOpenChange={setTaskOpen} />
    </div>
  );
}
