import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest } from "@/lib/queryClient";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminMessage {
  id: string;
  whatsappMessageId: string | null;
  recipientPhone: string;
  status: string;
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  accountName: string | null;
}

interface AdminMessagesResponse {
  messages: AdminMessage[];
  total: number;
  page: number;
  pageSize: number;
}

export function AdminMessagesPanel() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading, isFetching } = useQuery<AdminMessagesResponse>({
    queryKey: ["/api/admin/messages", { page, pageSize, search, status }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { page: number; pageSize: number; search: string; status: string }];
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.search.trim()) qs.set("search", params.search.trim());
      if (params.status !== "all") qs.set("status", params.status);
      const res = await apiRequest("GET", `/api/admin/messages?${qs}`);
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Every message sent across all tenants, with delivery status</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone or message ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 font-mono"
                data-testid="input-search-admin-messages"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-40" data-testid="select-admin-message-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No messages found.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender (Account)</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Queued</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((m) => (
                    <TableRow key={m.id} data-testid={`admin-message-row-${m.id}`}>
                      <TableCell className="text-sm">{m.accountName || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{m.recipientPhone}</TableCell>
                      <TableCell><StatusBadge status={m.status as any} type="message" size="sm" /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.queuedAt ? new Date(m.queuedAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.deliveredAt ? new Date(m.deliveredAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-destructive">
                        {m.errorCode ? `${m.errorCode}: ${m.errorDescription || ""}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} &middot; {total} messages</p>
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
