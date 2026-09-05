import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, PageSkeleton, KPIGridSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Download, AlertTriangle, Phone } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface AnalyticsData {
  dailyData: Array<{ date: string; sent: number; delivered: number; read: number; failed: number }>;
  hourlyData: Array<{ hour: string; messages: number }>;
  categoryData: Array<{ name: string; value: number; color: string }>;
  errorData: Array<{ code: string; description: string; count: number }>;
  costData: Array<{ date: string; cost: number }>;
  summary: {
    totalMessages: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    deliveryRate: number;
    readRate: number;
    totalCost: number;
  };
}

interface FailedMessage {
  id: string;
  recipientPhone: string;
  errorCode: string | null;
  errorDescription: string | null;
  sentAt: string | null;
  queuedAt: string | null;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const [showFailedDialog, setShowFailedDialog] = useState(false);

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?range=${timeRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const { data: failedMessages = [] } = useQuery<FailedMessage[]>({
    queryKey: ["/api/messages/failed"],
    enabled: showFailedDialog,
  });

  const downloadFailedCSV = () => {
    if (failedMessages.length === 0) return;
    const headers = "Phone Number,Error Code,Error Description,Date\n";
    const rows = failedMessages.map(m => 
      `"${m.recipientPhone}","${m.errorCode || ""}","${(m.errorDescription || "").replace(/"/g, '""')}","${m.sentAt || m.queuedAt || ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `failed-messages-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !analytics) {
    return <AnalyticsSkeleton />;
  }

  const { dailyData, hourlyData, categoryData, errorData, costData, summary } = analytics;

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title" data-testid="text-page-title">Analytics</h1>
          <p className="page-subtitle">
            Detailed insights into your messaging performance
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40" data-testid="select-time-range">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          label="Total Messages" 
          value={summary.totalMessages.toLocaleString()}
          subValue="this period"
        />
        <StatCard 
          label="Delivery Rate" 
          value={`${summary.deliveryRate.toFixed(1)}%`}
          subValue={`${summary.totalDelivered.toLocaleString()} delivered`}
        />
        <StatCard 
          label="Read Rate" 
          value={`${summary.readRate.toFixed(1)}%`}
          subValue={`${summary.totalRead.toLocaleString()} read`}
        />
        <button
          onClick={() => setShowFailedDialog(true)}
          className="text-left"
          data-testid="button-show-failed"
        >
          <Card className="hover-elevate h-full border-destructive/30">
            <CardContent className="p-6">
              <p className="text-xs font-medium text-destructive uppercase tracking-wider">
                Failed
              </p>
              <p className="text-2xl font-semibold mt-1 tabular-nums">{summary.totalFailed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.totalMessages > 0 ? ((summary.totalFailed / summary.totalMessages) * 100).toFixed(2) : 0}% failure rate · Click to view
              </p>
            </CardContent>
          </Card>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Message Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12
                    }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="hsl(var(--chart-2))" fill="url(#sentGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="delivered" stroke="hsl(var(--chart-1))" fill="url(#deliveredGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="read" stroke="hsl(var(--chart-3))" fill="url(#readGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 pt-2">
              <LegendItem color="hsl(var(--chart-2))" label="Sent" />
              <LegendItem color="hsl(var(--chart-1))" label="Delivered" />
              <LegendItem color="hsl(var(--chart-3))" label="Read" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Hourly Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12
                    }}
                  />
                  <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 pt-2">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Error Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {errorData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No errors in this period</p>
              ) : errorData.map((error) => (
                <div key={error.code} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-destructive w-16 shrink-0">
                    {error.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-sm truncate">{error.description}</span>
                      <span className="text-sm font-medium tabular-nums ml-2">{error.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-destructive/60"
                        style={{ width: `${(error.count / (errorData[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Cost"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="hsl(var(--chart-4))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-4))", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-sm text-muted-foreground">Total this period</span>
              <span className="text-lg font-semibold tabular-nums">
                ${costData.reduce((sum, d) => sum + d.cost, 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showFailedDialog} onOpenChange={setShowFailedDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Failed Messages ({failedMessages.length})
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadFailedCSV}
                disabled={failedMessages.length === 0}
                data-testid="button-download-failed-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {failedMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No failed messages found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {failedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`failed-msg-${msg.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                        <Phone className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium font-mono">{msg.recipientPhone}</p>
                        <p className="text-xs text-muted-foreground">
                          {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : msg.queuedAt ? new Date(msg.queuedAt).toLocaleString() : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {msg.errorCode && (
                        <Badge variant="destructive" className="text-xs">
                          {msg.errorCode}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                        {msg.errorDescription || "Unknown error"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subValue: string;
}

function StatCard({ label, value, subValue }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      </CardContent>
    </Card>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <PageSkeleton>
      <KPIGridSkeleton count={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ChartSkeleton height="h-80" />
        </div>
        <ChartSkeleton height="h-64" />
        <ChartSkeleton height="h-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton height="h-48" />
        <ChartSkeleton height="h-52" />
      </div>
    </PageSkeleton>
  );
}
