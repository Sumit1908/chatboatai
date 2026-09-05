import { useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  Shield,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  AlertTriangle,
  Trash2,
  BarChart3,
  Settings,
} from "lucide-react";
import type { User } from "@shared/models/auth";
import { AdminPlansPanel } from "@/components/admin-plans";
import { AdminPaymentsPanel } from "@/components/admin-payments";
import { AdminRevenuePanel } from "@/components/admin-revenue";
import { AdminLayout, parseAdminTab, type AdminTab } from "@/components/admin-layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableSkeleton } from "@/components/ui/skeleton";

const MONTHLY_PLAN_PRICE_INR = 1999;

interface AdminUser extends User {
  billingPlan?: {
    id: string;
    name: string;
    slug: string;
    priceLabel: string;
    amountInr: number;
  } | null;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  paidUsers: number;
  pendingApproval: number;
  mrrInr?: number;
}

interface VisitorAnalytics {
  visitors24h: number;
  visitors7d: number;
  visitorsAllTime: number;
  recentViews: Array<{
    id: string;
    path: string;
    sessionId: string;
    userId: string | null;
    referrer: string | null;
    timestamp: string;
  }>;
}

interface WorkspaceUsage {
  id: string;
  name: string;
  phoneNumber: string;
  messageCount: number;
  failedCount: number;
  failureRate: number;
  status: string;
  lastSyncedAt: string | null;
}

interface AuditLogEntry {
  id: string;
  actorLabel: string;
  action: string;
  targetLabel: string | null;
  description: string;
  timestamp: string;
}

interface AdminUploadFile {
  id: string;
  originalName: string | null;
  mimeType: string;
  size: number;
  userId: string | null;
  phoneNumberId: string | null;
  backend: "r2" | "database";
  createdAt: string | null;
}

interface AdminUploadsResponse {
  files: AdminUploadFile[];
  total: number;
  totalSize: number;
  page: number;
  pageSize: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tab = parseAdminTab(new URLSearchParams(search).get("tab"));

  const setTab = (next: AdminTab) => {
    if (next === "dashboard") {
      setLocation("/admin");
      return;
    }
    setLocation(`/admin?tab=${next}`);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: bootstrapData } = useQuery<{ available: boolean }>({
    queryKey: ["/api/admin/bootstrap-available"],
  });

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/bootstrap", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bootstrap-available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Success", description: "You are now a Super Admin!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to claim super admin role", variant: "destructive" });
    },
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  // Only actively poll while the relevant tab is open (the visitors count
  // still loads once for the sidebar badge on every tab, but there's no
  // reason to keep re-querying the database every 30s in the background
  // while the admin is looking at a different tab entirely).
  const { data: visitors } = useQuery<VisitorAnalytics>({
    queryKey: ["/api/admin/visitors"],
    refetchInterval: tab === "visitors" ? 30000 : false,
  });

  const { data: workspaceUsage = [] } = useQuery<WorkspaceUsage[]>({
    queryKey: ["/api/admin/workspace-usage"],
    refetchInterval: tab === "dashboard" ? 30000 : false,
  });

  const { data: auditLog = [] } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/admin/audit-log"],
    enabled: tab === "audit",
  });

  // ---- Uploaded files tab ----
  const [uploadsPage, setUploadsPage] = useState(1);
  const UPLOADS_PAGE_SIZE = 50;

  const { data: uploadsData, isFetching: uploadsFetching } = useQuery<AdminUploadsResponse>({
    queryKey: ["/api/admin/uploads", { page: uploadsPage, pageSize: UPLOADS_PAGE_SIZE }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { page: number; pageSize: number }];
      const res = await apiRequest("GET", `/api/admin/uploads?page=${params.page}&pageSize=${params.pageSize}`);
      return res.json();
    },
    enabled: tab === "files",
    placeholderData: keepPreviousData,
  });
  const uploadFiles = uploadsData?.files ?? [];
  const uploadsTotal = uploadsData?.total ?? 0;
  const uploadsTotalPages = Math.max(1, Math.ceil(uploadsTotal / UPLOADS_PAGE_SIZE));

  const deleteUploadMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/uploads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/uploads"] });
      toast({ title: "File deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete file", variant: "destructive" }),
  });

  // Shared confirm-delete dialog for the Files tab.
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { type: "file"; id: string; label: string }
  >(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const deleteTargetUserIdRef = useRef<string | null>(null);

  const openDeleteUserDialog = (user: AdminUser) => {
    deleteTargetUserIdRef.current = user.id;
    setUserToDelete(user);
  };

  const closeDeleteUserDialog = () => {
    if (deleteUserMutation.isPending) return;
    deleteTargetUserIdRef.current = null;
    setUserToDelete(null);
  };

  const confirmDeleteUser = () => {
    const userId = deleteTargetUserIdRef.current ?? userToDelete?.id;
    if (!userId) return;
    deleteUserMutation.mutate(userId);
  };

  const runConfirmedAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "file") deleteUploadMutation.mutate(confirmAction.id);
    setConfirmAction(null);
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-log"] });
      toast({ title: "Success", description: "User role updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user role", variant: "destructive" });
    },
  });

  const updateAccessMutation = useMutation({
    mutationFn: async ({ userId, grantedFreeAccess, subscriptionStatus, hasPaid }: {
      userId: string;
      grantedFreeAccess?: boolean;
      subscriptionStatus?: string;
      hasPaid?: boolean;
    }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/access`, { grantedFreeAccess, subscriptionStatus, hasPaid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-log"] });
      toast({ title: "Success", description: "User access updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user access", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest("DELETE", `/api/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-log"] });
      deleteTargetUserIdRef.current = null;
      setUserToDelete(null);
      toast({
        title: "User deleted",
        description: "The user and all associated data have been permanently removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message?.replace(/^\d+:\s*/, "") || "Could not delete user",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.subscriptionStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const pendingUsers = users.filter(u => u.subscriptionStatus === "inactive" && !u.grantedFreeAccess);

  const getStatusBadge = (user: User) => {
    if (user.grantedFreeAccess) {
      return <Badge className="bg-accent text-accent-foreground border-accent">Free Access</Badge>;
    }
    if (user.subscriptionStatus === "active") {
      return <Badge className="bg-accent text-accent-foreground border-accent">Active</Badge>;
    }
    if (user.subscriptionStatus === "trial") {
      return <Badge variant="secondary">Trial</Badge>;
    }
    if (user.subscriptionStatus === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    return <Badge variant="outline">Inactive</Badge>;
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return <Badge className="bg-primary text-primary-foreground">Super Admin</Badge>;
    }
    if (role === "admin") {
      return <Badge variant="secondary">Admin</Badge>;
    }
    return <Badge variant="outline">User</Badge>;
  };

  if (usersError) {
    const errorMessage = (usersError as Error).message || "";
    const isForbidden = errorMessage.includes("403") || errorMessage.includes("Forbidden");
    const isUnauthorized = errorMessage.includes("401") || errorMessage.includes("Unauthorized");

    if (isForbidden || isUnauthorized) {
      if (bootstrapData?.available) {
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Shield className="h-16 w-16 text-primary" />
            <h2 className="text-2xl font-semibold">Claim Super Admin Role</h2>
            <p className="text-muted-foreground">No super admin has been set up yet.</p>
            <p className="text-sm text-muted-foreground">As the first user, you can claim the super admin role to manage the platform.</p>
            <Button
              onClick={() => bootstrapMutation.mutate()}
              disabled={bootstrapMutation.isPending}
              data-testid="button-claim-super-admin"
            >
              {bootstrapMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Claiming...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" /> Claim Super Admin Role
                </>
              )}
            </Button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
          <p className="text-sm text-muted-foreground">Only Super Admins can access the admin dashboard.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold">Error Loading Admin Dashboard</h2>
        <p className="text-muted-foreground">Failed to load user data. Please try again.</p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })}
          data-testid="button-retry"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const paidUsers = stats?.paidUsers ?? 0;
  const trialUsers = stats?.trialUsers ?? 0;
  const totalUsers = stats?.totalUsers ?? 0;
  const pendingApproval = stats?.pendingApproval ?? 0;
  const mrr = stats?.mrrInr ?? paidUsers * MONTHLY_PLAN_PRICE_INR;
  const trialToPaidPct = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0;

  return (
    <AdminLayout activeTab={tab} onTabSelect={setTab}>
        {tab === "dashboard" && (
          <>
            <div>
              <h1 className="font-heading text-2xl font-bold" data-testid="text-admin-title">Admin dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage users, subscriptions, and platform access</p>
            </div>

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
              <Card className="border-t-[3px] border-t-foreground">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Total users</div>
                  <div className="font-heading text-3xl font-bold mt-1" data-testid="text-total-users">{totalUsers}</div>
                </CardContent>
              </Card>
              <Card className="border-t-[3px] border-t-[hsl(var(--chart-2))]">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Active</div>
                  <div className="font-heading text-3xl font-bold mt-1" data-testid="text-active-users">{stats?.activeUsers ?? 0}</div>
                </CardContent>
              </Card>
              <Card className="border-t-[3px] border-t-[hsl(var(--chart-3))]">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Trial</div>
                  <div className="font-heading text-3xl font-bold mt-1" data-testid="text-trial-users">{trialUsers}</div>
                </CardContent>
              </Card>
              <Card className="border-t-[3px] border-t-foreground">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Paid</div>
                  <div className="font-heading text-3xl font-bold mt-1" data-testid="text-paid-users">{paidUsers}</div>
                </CardContent>
              </Card>
              <Card className={cn("border-t-[3px]", pendingApproval > 0 ? "border-t-destructive" : "border-t-[hsl(var(--chart-4))]")}>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending</div>
                  <div className={cn("font-heading text-3xl font-bold mt-1", pendingApproval > 0 && "text-destructive")} data-testid="text-pending-users">{pendingApproval}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Users by status</CardTitle></CardHeader>
                <CardContent className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-full shrink-0"
                    style={{
                      background: totalUsers > 0
                        ? `conic-gradient(hsl(var(--chart-2)) 0 ${(stats!.activeUsers / totalUsers) * 360}deg, hsl(var(--chart-3)) 0 360deg)`
                        : "hsl(var(--muted))",
                    }}
                  />
                  <div className="flex flex-col gap-1.5 text-xs flex-1">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--chart-2))]" /><span className="text-muted-foreground">Active</span><span className="ml-auto font-semibold">{stats?.activeUsers ?? 0}</span></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--chart-3))]" /><span className="text-muted-foreground">Trial</span><span className="ml-auto font-semibold">{trialUsers}</span></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Subscriptions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Paid</span><span className="font-semibold">{paidUsers} of {totalUsers}</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground rounded-full" style={{ width: `${totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Trial</span><span className="font-semibold">{trialUsers} of {totalUsers}</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-[hsl(var(--chart-3))] rounded-full" style={{ width: `${totalUsers > 0 ? (trialUsers / totalUsers) * 100 : 0}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Pending approval</span><span className="font-semibold">{pendingApproval}</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-destructive rounded-full" style={{ width: `${totalUsers > 0 ? (pendingApproval / totalUsers) * 100 : 0}%` }} /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-[#14205a]">
                    Quick actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <button
                    onClick={() => setTab("users")}
                    className="border border-[#14205a]/12 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-left flex justify-between text-[#14205a] hover:border-cyan-500 hover:bg-white transition-colors"
                  >
                    Review pending users <span>&rarr;</span>
                  </button>
                  <button
                    onClick={() => setTab("visitors")}
                    className="border border-[#14205a]/12 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-left flex justify-between text-[#14205a] hover:border-cyan-500 hover:bg-white transition-colors"
                  >
                    View visitor activity <span>&rarr;</span>
                  </button>
                  <button
                    onClick={() => setTab("audit")}
                    className="border border-[#14205a]/12 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-left flex justify-between text-[#14205a] hover:border-cyan-500 hover:bg-white transition-colors"
                  >
                    View audit log <span>&rarr;</span>
                  </button>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold">Pending approvals</CardTitle>
                  {pendingUsers.length > 0 && (
                    <Badge className="bg-[hsl(var(--chart-4))] text-white border-transparent">{pendingUsers.length} waiting</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-1">
                  {pendingUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No users waiting for approval</p>
                  ) : (
                    pendingUsers.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center gap-3 py-2.5 border-b last:border-0" data-testid={`pending-user-${user.id}`}>
                        <Avatar className="h-9 w-9"><AvatarFallback>{user.firstName?.[0] || user.email?.[0] || "U"}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{user.firstName || user.email}</div>
                          <div className="text-xs text-muted-foreground">Requested {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</div>
                        </div>
                        <Button size="sm" onClick={() => updateAccessMutation.mutate({ userId: user.id, grantedFreeAccess: true, subscriptionStatus: "active" })} disabled={updateAccessMutation.isPending}>
                          Approve
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold">Revenue</CardTitle>
                  <span className="text-xs text-muted-foreground">Based on ₹{MONTHLY_PLAN_PRICE_INR}/mo plan</span>
                </CardHeader>
                <CardContent className="flex gap-8 flex-wrap">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">MRR (est.)</div>
                    <div className="font-heading text-2xl font-bold mt-1">₹{mrr.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Paid plans</div>
                    <div className="font-heading text-2xl font-bold mt-1">{paidUsers}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Users on paid</div>
                    <div className="font-heading text-2xl font-bold mt-1">{trialToPaidPct}%</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Workspace usage &amp; API health</CardTitle>
                <CardDescription>Message volume and delivery failures per connected WhatsApp account</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Failure rate</TableHead>
                      <TableHead>Last synced</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workspaceUsage.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No connected workspaces yet</TableCell></TableRow>
                    ) : (
                      workspaceUsage.map((w) => (
                        <TableRow key={w.id} data-testid={`workspace-row-${w.id}`}>
                          <TableCell>
                            <div className="font-medium text-sm">{w.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{w.phoneNumber}</div>
                          </TableCell>
                          <TableCell className="tabular-nums">{w.messageCount.toLocaleString()}</TableCell>
                          <TableCell>
                            {w.messageCount === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className={cn("font-semibold", w.failureRate > 20 ? "text-destructive" : "text-foreground")}>
                                {w.failureRate.toFixed(1)}%
                                {w.failureRate > 20 && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 -mt-0.5" />}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {w.lastSyncedAt ? new Date(w.lastSyncedAt).toLocaleString() : "never"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={w.status === "connected" ? "bg-accent text-accent-foreground" : ""}>
                              {w.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {tab === "visitors" && (
          <>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-heading text-2xl font-bold">Visitors</h1>
                <p className="text-sm text-muted-foreground">Live feed of page visits across the site</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-foreground bg-accent rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--chart-2))]" /> LIVE &middot; refreshes every 30s
              </span>
            </div>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><div className="text-xs text-muted-foreground">Visitors &middot; 24h</div><div className="font-heading text-2xl font-bold mt-1" data-testid="text-visitors-24h">{visitors?.visitors24h ?? 0}</div></div>
                <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center"><Eye className="h-4 w-4" /></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><div className="text-xs text-muted-foreground">Visitors &middot; 7 days</div><div className="font-heading text-2xl font-bold mt-1" data-testid="text-visitors-7d">{visitors?.visitors7d ?? 0}</div></div>
                <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center"><Globe className="h-4 w-4" /></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><div className="text-xs text-muted-foreground">Visitors &middot; all time</div><div className="font-heading text-2xl font-bold mt-1" data-testid="text-visitors-all-time">{visitors?.visitorsAllTime ?? 0}</div></div>
                <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center"><Users className="h-4 w-4" /></div>
              </CardContent></Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent visitor activity</CardTitle>
                <CardDescription>Live feed of page visits across the site, refreshes every 30s</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Referrer</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!visitors?.recentViews?.length ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No visitor activity recorded yet</TableCell></TableRow>
                      ) : (
                        visitors.recentViews.map((view) => (
                          <TableRow key={view.id} data-testid={`row-visitor-${view.id}`}>
                            <TableCell className="font-mono text-xs">{view.path}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{view.userId ? "Logged in" : "Anonymous"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{view.referrer || "Direct"}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{new Date(view.timestamp).toLocaleTimeString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {tab === "plans" && <AdminPlansPanel />}

        {tab === "revenue" && <AdminRevenuePanel />}

        {tab === "payments" && <AdminPaymentsPanel />}

        {tab === "users" && (
          <>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-heading text-2xl font-bold">User management</h1>
                <p className="text-sm text-muted-foreground">View and manage all registered users</p>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-users"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-role-filter"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                    }}
                    data-testid="button-refresh-users"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {usersLoading ? (
                  <div className="rounded-md border animate-in fade-in duration-300">
                    <TableSkeleton rows={8} cols={6} />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.profileImageUrl || undefined} />
                                    <AvatarFallback>{user.firstName?.[0] || user.email?.[0] || "U"}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{getRoleBadge(user.role)}</TableCell>
                              <TableCell>
                                {user.billingPlan ? (
                                  <div>
                                    <p className="font-medium text-sm">{user.billingPlan.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.billingPlan.priceLabel}/mo</p>
                                  </div>
                                ) : user.grantedFreeAccess ? (
                                  <span className="text-sm text-muted-foreground">Free access</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(user)}</TableCell>
                              <TableCell className="text-muted-foreground">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Link href={`/admin/users/${user.id}`}>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      title="Manage user workspace"
                                      data-testid={`button-user-settings-${user.id}`}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" data-testid={`button-role-${user.id}`}>Role <ChevronDown className="ml-1 h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: "user" })}>Set as User</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: "admin" })}>Set as Admin</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: "super_admin" })}>Set as Super Admin</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  <Button
                                    variant={user.grantedFreeAccess ? "destructive" : "default"}
                                    size="sm"
                                    onClick={() => updateAccessMutation.mutate({
                                      userId: user.id,
                                      grantedFreeAccess: !user.grantedFreeAccess,
                                      subscriptionStatus: !user.grantedFreeAccess ? "active" : "inactive"
                                    })}
                                    disabled={updateAccessMutation.isPending}
                                    data-testid={`button-access-${user.id}`}
                                  >
                                    {user.grantedFreeAccess ? (<><XCircle className="h-4 w-4 mr-1" /> Revoke</>) : (<><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</>)}
                                  </Button>

                                  <Button
                                    variant={user.hasPaid ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => updateAccessMutation.mutate({
                                      userId: user.id,
                                      hasPaid: !user.hasPaid,
                                      subscriptionStatus: !user.hasPaid ? "active" : "inactive",
                                    })}
                                    disabled={updateAccessMutation.isPending}
                                    data-testid={`button-premium-${user.id}`}
                                  >
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    {user.hasPaid ? "Remove Premium" : "Mark Premium"}
                                  </Button>

                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    title={
                                      user.id === currentUser?.id
                                        ? "You cannot delete your own account"
                                        : "Delete user and all data"
                                    }
                                    disabled={user.id === currentUser?.id || deleteUserMutation.isPending}
                                    onClick={() => openDeleteUserDialog(user)}
                                    data-testid={`button-delete-user-${user.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {tab === "audit" && (
          <>
            <div>
              <h1 className="font-heading text-2xl font-bold">Audit log</h1>
              <p className="text-sm text-muted-foreground">Every admin action, who did it, and when</p>
            </div>
            <Card>
              <CardContent className="p-0">
                {auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">No admin actions recorded yet</p>
                ) : (
                  auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3.5 flex-wrap px-6 py-3.5 border-b last:border-0" data-testid={`audit-entry-${entry.id}`}>
                      <div className="w-9 h-9 rounded-full bg-[hsl(var(--chart-2))] text-[#0B1030] flex items-center justify-center font-bold text-xs shrink-0">
                        {entry.actorLabel[0]?.toUpperCase() || "A"}
                      </div>
                      <div className="flex-1 min-w-[240px] text-sm">
                        <span className="font-semibold">{entry.actorLabel}</span>{" "}
                        <span className="text-muted-foreground">{entry.description}</span>
                      </div>
                      <Badge variant="secondary" className="uppercase text-[11px] tracking-wide">{entry.action.replace("_", " ")}</Badge>
                      <div className="text-xs text-muted-foreground font-mono">{new Date(entry.timestamp).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}

        {tab === "files" && (
          <>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-heading text-2xl font-bold">Uploaded files</h1>
                <p className="text-sm text-muted-foreground">Template and campaign media across every tenant</p>
              </div>
              <div className="rounded-md border px-4 py-2.5">
                <p className="text-xs text-muted-foreground">Total storage used</p>
                <p className="font-heading text-lg font-bold">
                  {formatBytes(uploadsData?.totalSize || 0)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">({uploadsTotal} files)</span>
                </p>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Storage</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadFiles.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No uploaded files</TableCell></TableRow>
                      ) : (
                        uploadFiles.map((file) => (
                          <TableRow key={file.id} data-testid={`row-upload-${file.id}`}>
                            <TableCell className="max-w-[280px] truncate" title={file.originalName || file.id}>
                              {file.originalName || file.id}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{file.mimeType}</TableCell>
                            <TableCell>{formatBytes(file.size)}</TableCell>
                            <TableCell>
                              <Badge variant={file.backend === "r2" ? "default" : "secondary"}>
                                {file.backend === "r2" ? "R2" : "Database"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setConfirmAction({ type: "file", id: file.id, label: file.originalName || file.id })}
                                data-testid={`button-delete-upload-${file.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">Page {uploadsPage} of {uploadsTotalPages}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadsPage((p) => Math.max(1, p - 1))}
                      disabled={uploadsPage <= 1 || uploadsFetching}
                      data-testid="button-uploads-prev"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadsPage((p) => Math.min(uploadsTotalPages, p + 1))}
                      disabled={uploadsPage >= uploadsTotalPages || uploadsFetching}
                      data-testid="button-uploads-next"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{confirmAction?.label}&quot; will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-admin-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirmedAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-admin-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && closeDeleteUserDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This will permanently delete{" "}
                  <span className="font-semibold text-foreground">
                    {userToDelete?.email || userToDelete?.id}
                  </span>{" "}
                  and <strong className="text-foreground">all</strong> associated data, including:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>WhatsApp accounts and phone numbers</li>
                  <li>Contacts, lists, and tags</li>
                  <li>Campaigns, notifications, and messages</li>
                  <li>Templates, inbox conversations, and uploaded media</li>
                  <li>Billing history and team memberships</li>
                </ul>
                <p className="font-medium text-destructive">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDeleteUser();
              }}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
