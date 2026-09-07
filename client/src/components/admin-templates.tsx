import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Search, Filter, ChevronLeft, ChevronRight, Pause, Play, Trash2 } from "lucide-react";

interface AdminTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  accountName: string | null;
  createdAt: string | null;
}

interface AdminTemplatesResponse {
  templates: AdminTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

function statusBadge(status: string) {
  switch (status) {
    case "APPROVED": return <Badge className="bg-green-500/10 text-green-600 border-green-200">Approved</Badge>;
    case "PENDING": return <Badge variant="secondary">Pending</Badge>;
    case "REJECTED": return <Badge variant="destructive">Rejected</Badge>;
    case "PAUSED": return <Badge variant="outline">Paused</Badge>;
    case "DISABLED": return <Badge variant="outline">Disabled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export function AdminTemplatesPanel() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const pageSize = 25;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<AdminTemplatesResponse>({
    queryKey: ["/api/admin/templates", { page, pageSize, search, status }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { page: number; pageSize: number; search: string; status: string }];
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.search.trim()) qs.set("search", params.search.trim());
      if (params.status !== "all") qs.set("status", params.status);
      const res = await apiRequest("GET", `/api/admin/templates?${qs}`);
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const templates = data?.templates ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/templates/${id}/status`, { status }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Template updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/templates/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Template deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete template", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Templates</h1>
        <p className="text-sm text-muted-foreground">Every message template across all tenants</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search template name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
                data-testid="input-search-admin-templates"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-40" data-testid="select-admin-template-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="DISABLED">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading templates…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No templates found.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id} data-testid={`admin-template-row-${t.id}`}>
                      <TableCell>
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.language}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.accountName || "—"}</TableCell>
                      <TableCell className="text-sm">{t.category}</TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {t.status === "PAUSED" || t.status === "DISABLED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: t.id, status: "APPROVED" })}
                              data-testid={`button-activate-template-${t.id}`}
                            >
                              <Play className="h-3.5 w-3.5 mr-1.5" /> Activate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={statusMutation.isPending || t.status !== "APPROVED"}
                              onClick={() => statusMutation.mutate({ id: t.id, status: "PAUSED" })}
                              data-testid={`button-deactivate-template-${t.id}`}
                            >
                              <Pause className="h-3.5 w-3.5 mr-1.5" /> Deactivate
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={deleteMutation.isPending}
                            onClick={() => setConfirmDelete({ id: t.id, name: t.name })}
                            data-testid={`button-delete-template-${t.id}`}
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
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} &middot; {total} templates</p>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isFetching}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 disabled:opacity-40" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isFetching}>
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be permanently removed from the platform. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDelete) deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
