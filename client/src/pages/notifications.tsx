import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  MoreVertical,
  Bell,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  FileText,
  Trash2,
  Play,
  Edit,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Notification, Template, WhatsAppAccount } from "@shared/schema";

function isConnectedAccount(account: WhatsAppAccount): boolean {
  const status = (account.status || "").toLowerCase();
  if (status && status !== "connected") return false;
  return !!(account.accessToken && account.phoneNumberId);
}

export default function Notifications() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: accountsData } = useQuery<{ accounts: WhatsAppAccount[]; activeAccountId?: string }>({
    queryKey: ["/api/accounts"],
  });

  const hasConnectedMeta = (accountsData?.accounts ?? []).some(isConnectedAccount);

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Notification deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/notifications/${id}/send`);
    },
    onSuccess: () => {
      toast({ title: "Notification is being sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({ title: "Failed to send notification", variant: "destructive" });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "scheduled":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "sending":
        return <Send className="h-4 w-4 text-[hsl(var(--chart-2))] animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-foreground" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "sending") {
      return <Badge variant="secondary" className="bg-accent text-accent-foreground">{status}</Badge>;
    }
    if (status === "completed") {
      return <Badge variant="secondary" className="bg-[#E9EDFB] text-[#141A46] dark:bg-[hsl(var(--muted))] dark:text-foreground">{status}</Badge>;
    }
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      scheduled: "outline",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title" data-testid="text-page-title">Notifications</h1>
          <p className="page-subtitle">
            Create and schedule broadcast notifications
          </p>
        </div>
        <Button
          asChild={hasConnectedMeta}
          disabled={!hasConnectedMeta}
          data-testid="button-create-notification"
          onClick={() => {
            if (!hasConnectedMeta) {
              toast({
                title: "Connect WhatsApp first",
                description: "Connect a WhatsApp Business number (Meta API) before creating notifications.",
                variant: "destructive",
              });
            }
          }}
        >
          {hasConnectedMeta ? (
            <Link href="/notifications/new">
              <Plus className="h-4 w-4 mr-2" />
              New Notification
            </Link>
          ) : (
            <span className="inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Notification
            </span>
          )}
        </Button>
      </div>

      {!hasConnectedMeta && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 text-amber-950">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1 text-sm">
              Connect an active WhatsApp Business number with Meta API before creating notifications.
            </div>
            <Button asChild variant="outline" size="sm" className="border-amber-300">
              <Link href="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Drafts</p>
                <p className="text-lg font-semibold tabular-nums">{notifications.filter((n) => n.status === "draft").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-lg font-semibold tabular-nums">{notifications.filter((n) => n.status === "scheduled").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Send className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Sending</p>
                <p className="text-lg font-semibold tabular-nums">{notifications.filter((n) => n.status === "sending").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold tabular-nums">{notifications.filter((n) => n.status === "completed").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/60 bg-white/80 p-4 space-y-3 animate-in fade-in duration-300"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-5 w-5 rounded-md mt-0.5" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3.5 w-28" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
                <p className="text-sm">Create your first notification to start broadcasting</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const template = templates.find((t) => t.id === notification.templateId);
                  
                  return (
                    <Card
                      key={notification.id}
                      className="hover-elevate cursor-pointer"
                      data-testid={`notification-${notification.id}`}
                      onClick={() => navigate(
                        notification.status === "draft"
                          ? `/notifications/${notification.id}/edit`
                          : `/notifications/${notification.id}/report`
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(notification.status)}
                            <div>
                              <h3 className="font-medium">{notification.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Template: {template?.name || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {getStatusBadge(notification.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-notification-menu-${notification.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {notification.status === "draft" && (
                                  <>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/notifications/${notification.id}/edit`}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => sendNotificationMutation.mutate(notification.id)}>
                                      <Play className="h-4 w-4 mr-2" />
                                      Send Now
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {notification.status !== "draft" && (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/notifications/${notification.id}/report`}>
                                      <BarChart3 className="h-4 w-4 mr-2" />
                                      View Report
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteNotificationMutation.mutate(notification.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{(notification.totalRecipients ?? 0).toLocaleString()} recipients</span>
                          </div>
                          {notification.scheduledAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Scheduled for {formatDate(notification.scheduledAt)}</span>
                            </div>
                          )}
                          {notification.status === "completed" && (
                            <div className="flex items-center gap-3">
                              <span className="text-green-600">{notification.deliveredCount} delivered</span>
                              <span className="text-blue-600">{notification.readCount} read</span>
                              {(notification.failedCount ?? 0) > 0 && (
                                <span className="text-red-600">{notification.failedCount} failed</span>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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
