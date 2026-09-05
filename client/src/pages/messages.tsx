import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton, TableSkeleton, KPIGridSkeleton, PageSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Message, Template } from "@shared/schema";

export default function Messages() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 25;
  const { toast } = useToast();

  type MessagesPage = {
    messages: Message[];
    total: number;
    statusCounts: Record<string, number>;
  };

  const { data, isLoading, refetch, isRefetching } = useQuery<MessagesPage>({
    queryKey: ["/api/messages", page, perPage, statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(perPage),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await fetch(`/api/messages?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const getTemplateName = (templateId: string | null) => {
    if (!templateId) return "Unknown";
    const template = templates.find((t) => t.id === templateId);
    return template?.name || templateId;
  };

  const messages = data?.messages || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const statusCounts = {
    all: data?.statusCounts?.all || 0,
    sent: data?.statusCounts?.sent || 0,
    delivered: data?.statusCounts?.delivered || 0,
    read: data?.statusCounts?.read || 0,
    failed: data?.statusCounts?.failed || 0,
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your message data is being prepared for download.",
    });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">
            Track message delivery and view detailed logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-messages"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="Total" count={statusCounts.all} />
        <SummaryCard label="Sent" count={statusCounts.sent} color="blue" />
        <SummaryCard label="Delivered" count={statusCounts.delivered} color="green" />
        <SummaryCard label="Read" count={statusCounts.read} color="primary" />
        <SummaryCard label="Failed" count={statusCounts.failed} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone or message ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9 font-mono"
            data-testid="input-search-messages"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Messages</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <MessagesTableSkeleton />
          ) : messages.length === 0 ? (
            <div className="py-16 text-center">
              <MessageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No messages found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters"
                  : "Messages will appear here when campaigns are sent"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Message ID</TableHead>
                    <TableHead className="w-[140px]">Recipient</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[140px]">Sent</TableHead>
                    <TableHead className="w-[140px]">Delivered</TableHead>
                    <TableHead className="w-[140px]">Read</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow 
                      key={message.id}
                      className="transition-colors"
                      data-testid={`message-row-${message.id}`}
                    >
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono text-xs cursor-help truncate block max-w-[120px]">
                              {message.whatsappMessageId || message.id}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">{message.whatsappMessageId || message.id}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {message.recipientPhone}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs truncate block max-w-[150px]">
                          {getTemplateName(message.templateId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge 
                          status={message.status as any} 
                          type="message" 
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {message.sentAt 
                          ? format(new Date(message.sentAt), "MMM d, h:mm a")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {message.deliveredAt 
                          ? format(new Date(message.deliveredAt), "MMM d, h:mm a")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {message.readAt 
                          ? format(new Date(message.readAt), "MMM d, h:mm a")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {message.errorCode ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-destructive font-mono cursor-help">
                                {message.errorCode}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">{message.errorDescription || "Unknown error"}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, total)} of {total} messages
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm tabular-nums px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  count: number;
  color?: "blue" | "green" | "primary" | "red";
}

function SummaryCard({ label, count, color }: SummaryCardProps) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    primary: "text-primary",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className={`text-2xl font-semibold tabular-nums mt-1 ${color ? colorClasses[color] : ""}`}>
          {count.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function MessagesTableSkeleton() {
  return <TableSkeleton rows={8} cols={7} />;
}
