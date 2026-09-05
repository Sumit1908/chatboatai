import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { AdminLayout, type AdminTab } from "@/components/admin-layout";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import type { Contact, ContactList } from "@shared/schema";
import {
  ArrowLeft,
  Download,
  Trash2,
  RefreshCw,
  List as ListIcon,
  Users,
  Phone,
} from "lucide-react";

interface AdminUserDetailResponse {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    role: string;
    subscriptionStatus: string;
    hasPaid: boolean;
    grantedFreeAccess: boolean;
    createdAt: string | null;
    subscriptionEndsAt: string | null;
    billingPlan: {
      id: string;
      name: string;
      priceLabel: string;
    } | null;
  };
  accounts: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    status: string;
    contactCount: number;
    listCount: number;
    contacts: Contact[];
    lists: ContactList[];
    createdAt: string | null;
  }>;
  totals: {
    accountCount: number;
    contactCount: number;
    listCount: number;
  };
}

type ConfirmAction =
  | { type: "delete-all-contacts"; accountId?: string; label: string }
  | { type: "delete-all-lists"; accountId?: string; label: string }
  | { type: "delete-contact"; accountId: string; contactId: string; label: string }
  | { type: "delete-list"; listId: string; label: string };

function AdminUserDetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-7 w-52 mt-4" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>

      <Card className="border-[#14205a]/10">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-56" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-10" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-[#14205a]/10">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="rounded-md border max-h-96 overflow-y-auto">
            <TableSkeleton rows={6} cols={5} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminUserDetail() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const detailQueryKey = ["/api/admin/users", userId, "detail"];

  const { data, isLoading, error, refetch, isFetching } = useQuery<AdminUserDetailResponse>({
    queryKey: detailQueryKey,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/users/${userId}/detail`);
      return res.json();
    },
    enabled: !!userId,
  });

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: detailQueryKey });
  };

  const deleteAllContactsMutation = useMutation({
    mutationFn: async (accountId?: string) => {
      const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
      return apiRequest("DELETE", `/api/admin/users/${userId}/contacts${qs}`);
    },
    onSuccess: async (res) => {
      const body = await res.json();
      invalidateDetail();
      toast({ title: "Contacts deleted", description: `${body.deleted} contact(s) removed.` });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete contacts", variant: "destructive" }),
  });

  const deleteAllListsMutation = useMutation({
    mutationFn: async (accountId?: string) => {
      const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
      return apiRequest("DELETE", `/api/admin/users/${userId}/lists${qs}`);
    },
    onSuccess: async (res) => {
      const body = await res.json();
      invalidateDetail();
      toast({ title: "Lists deleted", description: `${body.deleted} list(s) removed.` });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete lists", variant: "destructive" }),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async ({ accountId, contactId }: { accountId: string; contactId: string }) =>
      apiRequest("DELETE", `/api/admin/accounts/${accountId}/contacts/${contactId}`),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "Contact deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" }),
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => apiRequest("DELETE", `/api/admin/contact-lists/${listId}`),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "List deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete list", variant: "destructive" }),
  });

  const handleDownload = async (accountId?: string) => {
    try {
      const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
      const res = await fetch(`/api/admin/users/${userId}/contacts/export${qs}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        `contacts-${userId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error", description: "Failed to download contacts", variant: "destructive" });
    }
  };

  const runConfirmedAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "delete-all-contacts") {
      deleteAllContactsMutation.mutate(confirmAction.accountId);
    } else if (confirmAction.type === "delete-all-lists") {
      deleteAllListsMutation.mutate(confirmAction.accountId);
    } else if (confirmAction.type === "delete-contact") {
      deleteContactMutation.mutate({
        accountId: confirmAction.accountId,
        contactId: confirmAction.contactId,
      });
    } else if (confirmAction.type === "delete-list") {
      deleteListMutation.mutate(confirmAction.listId);
    }
    setConfirmAction(null);
  };

  const isDeleting =
    deleteAllContactsMutation.isPending ||
    deleteAllListsMutation.isPending ||
    deleteContactMutation.isPending ||
    deleteListMutation.isPending;

  const handleTabSelect = (tab: AdminTab) => {
    if (tab === "dashboard") {
      setLocation("/admin");
      return;
    }
    setLocation(`/admin?tab=${tab}`);
  };

  const renderContent = () => {
    if (isLoading) {
      return <AdminUserDetailSkeleton />;
    }

    if (error || !data) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-muted-foreground">Failed to load user details.</p>
          <Link href="/admin?tab=users">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to user management
            </Button>
          </Link>
        </div>
      );
    }

    const { user, accounts, totals } = data;

    return (
      <>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Link href="/admin?tab=users">
              <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to user management
              </Button>
            </Link>
            <h1 className="font-heading text-2xl font-bold">User workspace</h1>
            <p className="text-sm text-muted-foreground">
              Manage accounts, contacts, and lists for this user
            </p>
          </div>
        </div>

        <Card className="border-[#14205a]/10">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {user.firstName?.[0] || user.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-[#14205a]">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{user.role}</Badge>
                  <Badge variant="secondary">{user.subscriptionStatus}</Badge>
                  {user.billingPlan && (
                    <Badge className="bg-[#128C7E] text-white hover:bg-[#128C7E]">
                      {user.billingPlan.name} · {user.billingPlan.priceLabel}/mo
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload()}
                disabled={totals.contactCount === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Download all contacts
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={totals.contactCount === 0 || isDeleting}
                onClick={() =>
                  setConfirmAction({
                    type: "delete-all-contacts",
                    label: `all ${totals.contactCount} contacts across ${totals.accountCount} account(s)`,
                  })
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete all contacts
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={totals.listCount === 0 || isDeleting}
                onClick={() =>
                  setConfirmAction({
                    type: "delete-all-lists",
                    label: `all ${totals.listCount} lists across ${totals.accountCount} account(s)`,
                  })
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete all lists
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>WhatsApp accounts</CardDescription>
              <CardTitle className="text-2xl">{totals.accountCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total contacts</CardDescription>
              <CardTitle className="text-2xl">{totals.contactCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total lists</CardDescription>
              <CardTitle className="text-2xl">{totals.listCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              This user has no WhatsApp accounts connected yet.
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className="border-[#14205a]/10">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-4 w-4 text-[#128C7E]" />
                    {account.name}
                  </CardTitle>
                  <CardDescription className="mt-1 font-mono">{account.phoneNumber}</CardDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{account.status}</Badge>
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {account.contactCount} contacts
                    </Badge>
                    <Badge variant="secondary">
                      <ListIcon className="mr-1 h-3 w-3" />
                      {account.listCount} lists
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(account.id)}
                    disabled={account.contactCount === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={account.contactCount === 0 || isDeleting}
                    onClick={() =>
                      setConfirmAction({
                        type: "delete-all-contacts",
                        accountId: account.id,
                        label: `all ${account.contactCount} contacts in ${account.name}`,
                      })
                    }
                  >
                    Delete contacts
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={account.listCount === 0 || isDeleting}
                    onClick={() =>
                      setConfirmAction({
                        type: "delete-all-lists",
                        accountId: account.id,
                        label: `all ${account.listCount} lists in ${account.name}`,
                      })
                    }
                  >
                    Delete lists
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {account.lists.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Lists</p>
                    <div className="flex flex-wrap gap-2">
                      {account.lists.map((list) => (
                        <Badge
                          key={list.id}
                          variant="outline"
                          className="flex items-center gap-1.5 pr-1.5"
                        >
                          <ListIcon className="h-3 w-3" />
                          {list.name} ({list.contactCount || 0})
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                type: "delete-list",
                                listId: list.id,
                                label: list.name,
                              })
                            }
                            className="ml-1 text-destructive hover:opacity-70"
                            aria-label={`Delete list ${list.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                      <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.contacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            No contacts in this account
                          </TableCell>
                        </TableRow>
                      ) : (
                        account.contacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell className="font-mono">{contact.phone}</TableCell>
                            <TableCell>{contact.name || "—"}</TableCell>
                            <TableCell>{contact.email || "—"}</TableCell>
                            <TableCell>{contact.status}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  setConfirmAction({
                                    type: "delete-contact",
                                    accountId: account.id,
                                    contactId: contact.id,
                                    label: contact.name || contact.phone,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </>
    );
  };

  return (
    <AdminLayout activeTab="users" onTabSelect={handleTabSelect}>
      {renderContent()}

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "delete-list"
                ? `The list "${confirmAction.label}" will be deleted. Contacts are not removed.`
                : confirmAction?.type === "delete-contact"
                  ? `"${confirmAction.label}" and their message history will be permanently removed.`
                  : `This will permanently delete ${confirmAction?.label}. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirmedAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
