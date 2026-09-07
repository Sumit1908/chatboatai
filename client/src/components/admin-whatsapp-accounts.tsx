import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, ChevronLeft, ChevronRight, Unplug, Trash2 } from "lucide-react";

interface AdminWhatsappAccount {
  id: string;
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  status: string;
  qualityRating: string | null;
  createdAt: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
}

interface AdminAccountsResponse {
  accounts: AdminWhatsappAccount[];
  total: number;
  page: number;
  pageSize: number;
}

function statusBadge(status: string) {
  if (status === "connected") return <Badge className="bg-green-500/10 text-green-600 border-green-200">Connected</Badge>;
  if (status === "disconnected") return <Badge variant="secondary">Disconnected</Badge>;
  return <Badge variant="outline">{status || "Unknown"}</Badge>;
}

export function AdminWhatsappAccountsPanel() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<
    null | { type: "disconnect" | "delete"; id: string; label: string }
  >(null);
  const pageSize = 25;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<AdminAccountsResponse>({
    queryKey: ["/api/admin/whatsapp-accounts", { page, pageSize, search }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { page: number; pageSize: number; search: string }];
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.search.trim()) qs.set("search", params.search.trim());
      const res = await apiRequest("GET", `/api/admin/whatsapp-accounts?${qs}`);
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const accounts = data?.accounts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-accounts"] });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/admin/whatsapp-accounts/${id}/disconnect`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Account disconnected" });
    },
    onError: () => toast({ title: "Error", description: "Failed to disconnect account", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/whatsapp-accounts/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Account deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete account", variant: "destructive" }),
  });

  const runConfirmed = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "disconnect") disconnectMutation.mutate(confirmAction.id);
    else deleteMutation.mutate(confirmAction.id);
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">WhatsApp Accounts</h1>
        <p className="text-sm text-muted-foreground">Every connected WhatsApp Business number, across all tenants</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
              data-testid="input-search-whatsapp-accounts"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No WhatsApp accounts found.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>WhatsApp Number</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id} data-testid={`admin-whatsapp-account-${a.id}`}>
                      <TableCell>
                        <p className="font-medium text-sm">{a.ownerName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{a.ownerEmail || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{a.name || "WhatsApp Business"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{a.phoneNumber}</p>
                      </TableCell>
                      <TableCell>{statusBadge(a.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{a.qualityRating || "UNKNOWN"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={a.status === "disconnected" || disconnectMutation.isPending}
                            onClick={() => setConfirmAction({ type: "disconnect", id: a.id, label: a.name || a.phoneNumber })}
                            data-testid={`button-disconnect-${a.id}`}
                          >
                            <Unplug className="h-3.5 w-3.5 mr-1.5" /> Disconnect
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={deleteMutation.isPending}
                            onClick={() => setConfirmAction({ type: "delete", id: a.id, label: a.name || a.phoneNumber })}
                            data-testid={`button-delete-account-${a.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} &middot; {total} accounts</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isFetching}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isFetching}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete" ? "Delete this account?" : "Disconnect this account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "delete"
                ? `"${confirmAction.label}" and its record will be permanently removed. This cannot be undone.`
                : `"${confirmAction?.label}" will be marked disconnected and its stored access token cleared. The number will need to be reconnected before it can send messages again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmAction?.type === "delete" ? "Delete" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
