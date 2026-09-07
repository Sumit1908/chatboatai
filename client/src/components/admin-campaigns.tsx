import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest } from "@/lib/queryClient";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminCampaign {
  id: string;
  name: string;
  status: string;
  recipientCount: number;
  createdAt: string | null;
  startedAt: string | null;
  accountName: string | null;
}

interface AdminCampaignsResponse {
  campaigns: AdminCampaign[];
  total: number;
  page: number;
  pageSize: number;
}

export function AdminCampaignsPanel() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading, isFetching } = useQuery<AdminCampaignsResponse>({
    queryKey: ["/api/admin/campaigns", { page, pageSize, search, status }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { page: number; pageSize: number; search: string; status: string }];
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.search.trim()) qs.set("search", params.search.trim());
      if (params.status !== "all") qs.set("status", params.status);
      const res = await apiRequest("GET", `/api/admin/campaigns?${qs}`);
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const campaigns = data?.campaigns ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Campaigns</h1>
        <p className="text-sm text-muted-foreground">Every broadcast campaign across all tenants</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaign name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
                data-testid="input-search-admin-campaigns"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-40" data-testid="select-admin-campaign-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading campaigns…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No campaigns found.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Owner (Account)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id} data-testid={`admin-campaign-row-${c.id}`}>
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.accountName || "—"}</TableCell>
                      <TableCell><StatusBadge status={c.status as any} type="campaign" size="sm" /></TableCell>
                      <TableCell className="tabular-nums">{c.recipientCount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} &middot; {total} campaigns</p>
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
    </div>
  );
}
