import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  CheckCircle, 
  Eye, 
  XCircle, 
  FileText, 
  Activity,
  Zap,
  ArrowUpRight,
  Signal,
  Shield,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, PageSkeleton, KPIGridSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityFeed } from "@/components/activity-feed";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { DashboardMetrics, ActivityItem, Campaign } from "@shared/schema";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Dashboard() {
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: chartData } = useQuery<{ messageVolume: any[]; statusDistribution: any[] }>({
    queryKey: ["/api/dashboard/chart-data"],
  });

  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ["/api/dashboard/activities"],
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/dashboard/sync");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/chart-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });

      const warnings = data.syncResults?.errors?.length || 0;
      if (warnings > 0) {
        toast({
          title: "Synced with warnings",
          description: `Data synced from Meta API. ${warnings} item(s) could not be fetched.`,
        });
      } else {
        toast({
          title: "Sync complete",
          description: "Dashboard data refreshed from Meta API.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Could not sync with Meta API. Check your account settings.",
        variant: "destructive",
      });
    },
  });

  const activeCampaigns = campaigns.filter(c => c.status === "running");

  if (metricsLoading) {
    return <DashboardSkeleton />;
  }

  const dashboardMetrics: DashboardMetrics = metrics || {
    totalMessages: 0,
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    deliveryRate: 0,
    readRate: 0,
    totalCost: 0,
    activeCampaigns: 0,
    approvedTemplates: 0,
    pendingTemplates: 0,
    messagingLimit: 0,
    messagingUsed: 0,
    throughputLevel: null,
    qualityRating: "UNKNOWN",
    apiStatus: "disconnected",
    lastSyncedAt: null,
  };

  const messageVolume = chartData?.messageVolume || [];
  const statusDist = (chartData?.statusDistribution || []).map((s: any, i: number) => ({
    ...s,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const limitPercent = dashboardMetrics.messagingLimit > 0
    ? (dashboardMetrics.messagingUsed / dashboardMetrics.messagingLimit) * 100
    : 0;

  const qualityLabel = dashboardMetrics.qualityRating === "GREEN" ? "High" 
    : dashboardMetrics.qualityRating === "YELLOW" ? "Medium"
    : dashboardMetrics.qualityRating === "RED" ? "Low" : "N/A";

  const qualityColor = dashboardMetrics.qualityRating === "GREEN" ? "text-green-600 dark:text-green-400" 
    : dashboardMetrics.qualityRating === "YELLOW" ? "text-yellow-600 dark:text-yellow-400"
    : dashboardMetrics.qualityRating === "RED" ? "text-red-600 dark:text-red-400" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title" data-testid="text-dashboard-title">Overview</h1>
          <p className="page-subtitle">
            Monitor your messaging performance in real time
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dashboardMetrics.lastSyncedAt && (
            <span className="text-xs text-muted-foreground" data-testid="text-last-synced">
              Last synced {formatDistanceToNow(new Date(dashboardMetrics.lastSyncedAt), { addSuffix: true })}
            </span>
          )}
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync-dashboard"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", syncMutation.isPending && "animate-spin")} />
            {syncMutation.isPending ? "Syncing..." : "Sync with Meta"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Sent"
          value={dashboardMetrics.sentCount}
          icon={Send}
          iconColor="text-[hsl(var(--chart-2))]"
          iconBg=""
          borderColor="border-t-foreground"
          live
          testId="kpi-sent"
        />
        <KPICard
          label="Delivered"
          value={dashboardMetrics.deliveredCount}
          icon={CheckCircle}
          iconColor="text-[hsl(var(--chart-2))]"
          iconBg=""
          borderColor="border-t-[hsl(var(--chart-2))]"
          sub={`${dashboardMetrics.deliveryRate.toFixed(1)}%`}
          testId="kpi-delivered"
        />
        <KPICard
          label="Read"
          value={dashboardMetrics.readCount}
          icon={Eye}
          iconColor="text-[hsl(var(--chart-2))]"
          iconBg=""
          borderColor="border-t-[hsl(var(--chart-3))]"
          sub={`${dashboardMetrics.readRate.toFixed(1)}%`}
          testId="kpi-read"
        />
        <KPICard
          label="Failed"
          value={dashboardMetrics.failedCount}
          icon={XCircle}
          iconColor="text-destructive"
          iconBg=""
          borderColor="border-t-destructive"
          warn={dashboardMetrics.failedCount > 0}
          testId="kpi-failed"
        />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent">
                <Shield className={cn("h-4 w-4", qualityColor === "text-muted-foreground" ? "text-accent-foreground" : qualityColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Quality</p>
                <p className={cn("text-sm font-semibold", qualityColor)}>{qualityLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent">
                <Signal className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Limit</p>
                <p className="text-sm font-semibold tabular-nums">
                  {dashboardMetrics.messagingUsed.toLocaleString()}
                  {dashboardMetrics.messagingLimit > 0 && (
                    <span className="text-muted-foreground font-normal"> / {dashboardMetrics.messagingLimit.toLocaleString()}</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent">
                <FileText className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Templates</p>
                <p className="text-sm font-semibold tabular-nums">
                  {dashboardMetrics.approvedTemplates}<span className="text-muted-foreground font-normal"> approved</span>
                  {dashboardMetrics.pendingTemplates > 0 && (
                    <span className="text-[hsl(var(--chart-4))]"> +{dashboardMetrics.pendingTemplates}</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent">
                <Activity className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Campaigns</p>
                <p className="text-sm font-semibold">
                  {dashboardMetrics.activeCampaigns} <span className="text-muted-foreground font-normal">active</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Message Volume</CardTitle>
              <span className="text-xs text-muted-foreground">Last 24 hours</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {messageVolume.length > 0 ? (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={messageVolume} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="deliveredGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 11 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--popover))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sent"
                        stroke="hsl(var(--chart-2))"
                        fill="url(#sentGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="delivered"
                        stroke="hsl(var(--chart-1))"
                        fill="url(#deliveredGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 pt-2">
                  <ChartLegend color="hsl(var(--chart-2))" label="Sent" />
                  <ChartLegend color="hsl(var(--chart-1))" label="Delivered" />
                </div>
              </>
            ) : (
              <div className="h-72 flex items-center justify-center">
                <div className="text-center">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No message data in the last 24 hours</p>
                  <p className="text-xs text-muted-foreground mt-1">Send your first notification to see data here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Delivery Breakdown</CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {dashboardMetrics.totalMessages.toLocaleString()} total
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {statusDist.length > 0 ? (
              <>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {statusDist.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--popover))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 pt-2">
                  {statusDist.map((item: any) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div 
                        className="h-2 w-2 rounded-full shrink-0" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-xs text-muted-foreground flex-1">{item.name}</span>
                      <span className="text-xs font-medium tabular-nums">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">Messaging Capacity</CardTitle>
                <Badge variant="secondary" className="text-xs font-normal">
                  Synced from Meta
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardMetrics.messagingLimit > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-semibold tabular-nums">
                        {dashboardMetrics.messagingUsed.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        of {dashboardMetrics.messagingLimit.toLocaleString()} conversations used
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{limitPercent.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">used today</p>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        limitPercent > 80 ? "bg-destructive" : limitPercent > 50 ? "bg-yellow-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(limitPercent, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { label: "50", active: dashboardMetrics.messagingLimit >= 50 },
                      { label: "250", active: dashboardMetrics.messagingLimit >= 250 },
                      { label: "1K", active: dashboardMetrics.messagingLimit >= 1000 },
                      { label: "2K", active: dashboardMetrics.messagingLimit >= 2000 },
                      { label: "10K", active: dashboardMetrics.messagingLimit >= 10000 },
                      { label: "100K", active: dashboardMetrics.messagingLimit >= 100000 },
                      { label: "Unlimited", active: dashboardMetrics.messagingLimit >= 999999 },
                    ].map((tier) => (
                      <div key={tier.label} className="text-center">
                        <div className={cn(
                          "h-1 rounded-full mx-1 mb-1",
                          tier.active ? "bg-primary" : "bg-muted"
                        )} />
                        <span className={cn(
                          "text-[10px]",
                          tier.active ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>{tier.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <p className="text-sm font-medium">
                    {dashboardMetrics.messagingUsed.toLocaleString()} conversations used
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Meta no longer reports a fixed daily conversation cap for this number
                    {dashboardMetrics.throughputLevel ? ` - it reports a "${dashboardMetrics.throughputLevel.toLowerCase()}" throughput level instead` : ""}.
                    Check WhatsApp Manager in Meta Business Suite for your exact messaging limits.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">Active Campaigns</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/notifications" data-testid="link-all-campaigns">
                    View all
                    <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activeCampaigns.length === 0 ? (
                <div className="py-6 text-center">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No active campaigns</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Create a notification to start messaging</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCampaigns.slice(0, 3).map((campaign) => {
                    const total = campaign.recipients?.length || 0;
                    return (
                      <div 
                        key={campaign.id}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                        data-testid={`campaign-card-${campaign.id}`}
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Send className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {total.toLocaleString()} recipients
                          </p>
                        </div>
                        <StatusBadge status="running" type="campaign" size="sm" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <ActivityFeed 
            activities={activities}
            maxHeight="h-[420px]"
          />
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, iconColor, borderColor, sub, live, warn, testId }: {
  label: string;
  value: number;
  icon: any;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  sub?: string;
  live?: boolean;
  warn?: boolean;
  testId: string;
}) {
  return (
    <Card className={cn("border-t-[3px]", borderColor, warn && "border-destructive/40")} data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-heading text-3xl font-bold tabular-nums">
            {value.toLocaleString()}
          </span>
          {live && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              Live
            </span>
          )}
          {sub && (
            <span className="text-xs text-muted-foreground">{sub}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <PageSkeleton>
      <KPIGridSkeleton count={4} />
      <KPIGridSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartSkeleton height="h-72" />
        </div>
        <div className="lg:col-span-2">
          <ChartSkeleton height="h-72" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <ChartSkeleton height="h-48" />
          <ChartSkeleton height="h-40" />
        </div>
        <div className="lg:col-span-2">
          <ChartSkeleton height="h-[420px]" />
        </div>
      </div>
    </PageSkeleton>
  );
}
