import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  Phone,
  Users,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ReportData {
  notification: any;
  template: { name: string; category: string } | null;
  statusBreakdown: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    queued: number;
  };
  failedMessages: Array<{
    id: string;
    phone: string;
    errorCode: string | null;
    errorDescription: string | null;
    sentAt: string | null;
  }>;
  messages: Array<{
    id: string;
    phone: string;
    status: string;
    errorCode: string | null;
    errorDescription: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
  }>;
}

export default function NotificationReport() {
  const [, params] = useRoute("/notifications/:id/report");
  const [messageFilter, setMessageFilter] = useState("all");
  const { toast } = useToast();

  const { data: report, isLoading, isError, error, refetch } = useQuery<ReportData>({
    queryKey: ["/api/notifications", params?.id, "report"],
    queryFn: async () => {
      const res = await fetch(`/api/notifications/${params?.id}/report`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
    enabled: !!params?.id,
    refetchInterval: (query) => {
      const status = query.state.data?.notification?.status;
      return status === "sending" ? 5000 : false;
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/notifications/${params?.id}/resume`);
      return res.json();
    },
    onSuccess: (data: { message: string; remaining: number }) => {
      toast({ title: data.remaining > 0 ? "Resuming send" : "Already complete", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", params?.id, "report"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to resume", description: error?.message || "Could not resume sending", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent>
            </Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="space-y-4 max-w-lg">
        <Button variant="ghost" size="icon" asChild data-testid="button-back-notifications">
          <Link href="/notifications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Could not load report</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || "This notification may not exist or you may not have access."}
            </p>
            <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-report">
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { notification, template, statusBreakdown, failedMessages, messages } = report;
  const total = statusBreakdown.total || 1;
  const sentPct = ((statusBreakdown.sent / total) * 100).toFixed(1);
  const deliveredPct = ((statusBreakdown.delivered / total) * 100).toFixed(1);
  const readPct = ((statusBreakdown.read / total) * 100).toFixed(1);
  const failedPct = ((statusBreakdown.failed / total) * 100).toFixed(1);

  const chartData = [
    { name: "Sent", value: statusBreakdown.sent, color: "hsl(var(--chart-2))" },
    { name: "Delivered", value: statusBreakdown.delivered, color: "hsl(var(--chart-1))" },
    { name: "Read", value: statusBreakdown.read, color: "hsl(var(--chart-3))" },
    { name: "Failed", value: statusBreakdown.failed, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  const barData = [
    { name: "Sent", count: statusBreakdown.sent },
    { name: "Delivered", count: statusBreakdown.delivered },
    { name: "Read", count: statusBreakdown.read },
    { name: "Failed", count: statusBreakdown.failed },
  ];

  const filteredMessages = messageFilter === "all"
    ? messages
    : messages.filter(m => m.status === messageFilter);

  const downloadCSV = (data: any[], filename: string) => {
    const headers = "Phone Number,Status,Error Code,Error Description,Sent At,Delivered At,Read At\n";
    const rows = data.map(m => 
      `"${m.phone}","${m.status}","${m.errorCode || ""}","${(m.errorDescription || "").replace(/"/g, '""')}","${m.sentAt || ""}","${m.deliveredAt || ""}","${m.readAt || ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleString([], {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back-notifications">
          <Link href="/notifications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-report-title">
            {notification.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {template ? `Template: ${template.name} · ${template.category}` : ""}
            {notification.createdAt ? ` · Created ${formatDate(notification.createdAt)}` : ""}
          </p>
        </div>
        {notification.status === "sending" && (
          <Button
            variant="default"
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending}
            data-testid="button-resume-sending"
          >
            <Send className="h-4 w-4 mr-2" />
            {resumeMutation.isPending ? "Resuming..." : "Resume Sending"}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => downloadCSV(messages, `report-${notification.name}-${new Date().toISOString().split("T")[0]}.csv`)}
          data-testid="button-download-report"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <p className="text-2xl font-semibold mt-1">{statusBreakdown.total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">100%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <p className="text-2xl font-semibold mt-1">{statusBreakdown.sent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{sentPct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <p className="text-2xl font-semibold mt-1">{statusBreakdown.delivered.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{deliveredPct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Read</p>
            </div>
            <p className="text-2xl font-semibold mt-1">{statusBreakdown.read.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{readPct}%</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-xs text-destructive">Failed</p>
            </div>
            <p className="text-2xl font-semibold mt-1">{statusBreakdown.failed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{failedPct}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Delivery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.name === "Sent" ? "hsl(var(--chart-2))"
                          : entry.name === "Delivered" ? "hsl(var(--chart-1))"
                          : entry.name === "Read" ? "hsl(var(--chart-3))"
                          : "hsl(var(--destructive))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 pt-2">
              <LegendDot color="hsl(var(--chart-2))" label="Sent" />
              <LegendDot color="hsl(var(--chart-1))" label="Delivered" />
              <LegendDot color="hsl(var(--chart-3))" label="Read" />
              <LegendDot color="hsl(var(--destructive))" label="Failed" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-center justify-center">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
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
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 pt-2">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold">Message Details</CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={messageFilter} onValueChange={setMessageFilter}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-all-messages">All ({messages.length})</TabsTrigger>
                  <TabsTrigger value="delivered" data-testid="tab-delivered">Delivered</TabsTrigger>
                  <TabsTrigger value="read" data-testid="tab-read">Read</TabsTrigger>
                  <TabsTrigger value="failed" data-testid="tab-failed-messages">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCSV(filteredMessages, `${messageFilter}-messages-${notification.name}.csv`)}
                data-testid="button-download-filtered"
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No {messageFilter === "all" ? "" : messageFilter} messages found</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_2fr] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
                  <span>Phone Number</span>
                  <span>Status</span>
                  <span>Sent</span>
                  <span>Delivered</span>
                  <span>Error</span>
                </div>
                {filteredMessages.map((msg) => {
                  const errorText = [msg.errorCode, msg.errorDescription].filter(Boolean).join(": ");
                  return (
                    <div
                      key={msg.id}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr_2fr] gap-2 px-3 py-2.5 text-sm border-b last:border-0 items-center"
                      data-testid={`report-msg-${msg.id}`}
                    >
                      <span className="font-mono text-xs">{msg.phone}</span>
                      <span>
                        <Badge
                          variant={
                            msg.status === "delivered" || msg.status === "read" ? "default"
                            : msg.status === "failed" ? "destructive"
                            : "secondary"
                          }
                          className="text-xs"
                        >
                          {msg.status}
                        </Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(msg.sentAt)}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(msg.deliveredAt)}</span>
                      <span className="text-xs text-destructive break-words" title={errorText || undefined}>
                        {errorText || "-"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
