import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CalendarClock, Handshake, MoreHorizontal, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { apiRequest } from "@/lib/queryClient";
import { LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@shared/crm";
import type { CrmLead } from "@shared/schema";
import {
  CrmPageHeader,
  EmptyState,
  LeadFormDialog,
  LeadStatusBadge,
  QueryError,
  TaskFormDialog,
  formatInr,
  useCrmMutation,
} from "@/components/crm/crm-ui";

export default function LeadsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [editing, setEditing] = useState<CrmLead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [followUpFor, setFollowUpFor] = useState<CrmLead | null>(null);
  const [deleting, setDeleting] = useState<CrmLead | null>(null);

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search.trim()) params.set("search", search.trim());
  const qs = params.toString();
  const { data, isLoading, error } = useQuery<{ leads: CrmLead[] }>({
    queryKey: [`/api/crm/leads${qs ? `?${qs}` : ""}`],
  });
  const leads = data?.leads ?? [];

  const updateStatus = useCrmMutation(({ id, status }: { id: string; status: LeadStatus }) =>
    apiRequest("PATCH", `/api/crm/leads/${id}`, { status }),
  );
  const convert = useCrmMutation((id: string) => apiRequest("POST", `/api/crm/leads/${id}/convert`), {
    success: "Deal created from lead",
    onDone: () => navigate("/pipeline"),
  });
  const remove = useCrmMutation((id: string) => apiRequest("DELETE", `/api/crm/leads/${id}`), {
    success: "Lead deleted",
    onDone: () => setDeleting(null),
  });

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const filtered = status !== "all" || !!search.trim();

  return (
    <div className="mx-auto max-w-7xl">
      <CrmPageHeader
        title="Leads"
        description="Every enquiry in one list — track status, value and the next step."
        actions={
          <Button onClick={openNew} data-testid="button-add-lead">
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Add lead
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, phone or email"
            className="pl-9"
            aria-label="Search leads"
            data-testid="input-search-leads"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus | "all")}>
          <SelectTrigger className="sm:w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <QueryError error={error} />
      ) : isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={filtered ? "No leads match these filters" : "No leads yet"}
          description={
            filtered
              ? "Try a different search or status."
              : "Add enquiries from calls, walk-ins, your website or WhatsApp to start tracking them."
          }
          action={
            !filtered && (
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" aria-hidden /> Add your first lead
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm" data-testid="table-leads">
            <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Est. value</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="w-12 px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-muted/30" data-testid={`row-lead-${lead.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{lead.name}</p>
                    {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lead.phone && <p>{lead.phone}</p>}
                    {lead.email && <p className="text-xs">{lead.email}</p>}
                    {!lead.phone && !lead.email && "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] ?? lead.source}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={lead.status}
                      onValueChange={(v) => updateStatus.mutate({ id: lead.id, status: v as LeadStatus })}
                    >
                      <SelectTrigger className="h-8 w-auto gap-1.5 border-none bg-transparent px-0 shadow-none" aria-label={`Status for ${lead.name}`}>
                        <LeadStatusBadge status={lead.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {LEAD_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {lead.estimatedValueInr == null ? "—" : formatInr(lead.estimatedValueInr)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${lead.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFollowUpFor(lead)}>
                          <CalendarClock className="mr-2 h-4 w-4" aria-hidden /> Schedule follow-up
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={lead.status === "converted"} onClick={() => convert.mutate(lead.id)}>
                          <Handshake className="mr-2 h-4 w-4" aria-hidden /> Convert to deal
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(lead);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" aria-hidden /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(lead)}>
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} />
      <TaskFormDialog
        open={!!followUpFor}
        onOpenChange={(open) => !open && setFollowUpFor(null)}
        leadId={followUpFor?.id}
      />
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The lead is removed permanently. Deals and follow-ups linked to it are kept but unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              Delete lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
