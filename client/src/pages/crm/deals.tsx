import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Handshake, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { DEAL_STAGES, DEAL_STAGE_LABELS, isClosedStage, type DealStage } from "@shared/crm";
import type { CrmDeal } from "@shared/schema";
import {
  CrmPageHeader,
  DealFormDialog,
  DealStageBadge,
  EmptyState,
  QueryError,
  STAGE_BAR_COLOR,
  TaskFormDialog,
  formatInr,
  useCrmMutation,
} from "@/components/crm/crm-ui";

function useDeals() {
  return useQuery<{ deals: CrmDeal[] }>({ queryKey: ["/api/crm/deals"] });
}

/** Shared state + dialogs for editing, deleting, moving and following up on deals. */
function useDealActions() {
  const [editing, setEditing] = useState<CrmDeal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [newStage, setNewStage] = useState<DealStage | undefined>();
  const [deleting, setDeleting] = useState<CrmDeal | null>(null);
  const [followUpFor, setFollowUpFor] = useState<CrmDeal | null>(null);

  const move = useCrmMutation(({ id, stage }: { id: string; stage: DealStage }) =>
    apiRequest("PATCH", `/api/crm/deals/${id}`, { stage }),
  );
  const remove = useCrmMutation((id: string) => apiRequest("DELETE", `/api/crm/deals/${id}`), {
    success: "Deal deleted",
    onDone: () => setDeleting(null),
  });

  const openNew = (stage?: DealStage) => {
    setEditing(null);
    setNewStage(stage);
    setFormOpen(true);
  };

  const menu = (deal: CrmDeal) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${deal.title}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
        {DEAL_STAGES.filter((s) => s !== deal.stage).map((s) => (
          <DropdownMenuItem key={s} onClick={() => move.mutate({ id: deal.id, stage: s })}>
            <span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_BAR_COLOR[s] }} aria-hidden />
            {DEAL_STAGE_LABELS[s]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setFollowUpFor(deal)}>
          <CalendarClock className="mr-2 h-4 w-4" aria-hidden /> Schedule follow-up
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setEditing(deal);
            setFormOpen(true);
          }}
        >
          <Pencil className="mr-2 h-4 w-4" aria-hidden /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(deal)}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const dialogs = (
    <>
      <DealFormDialog open={formOpen} onOpenChange={setFormOpen} deal={editing} defaultStage={newStage} />
      <TaskFormDialog
        open={!!followUpFor}
        onOpenChange={(open) => !open && setFollowUpFor(null)}
        dealId={followUpFor?.id}
        leadId={followUpFor?.leadId}
      />
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The deal is removed permanently. Follow-ups linked to it are kept but unlinked.
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
              Delete deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { openNew, menu, dialogs, move };
}

export function DealsPage() {
  const { data, isLoading, error } = useDeals();
  const { openNew, menu, dialogs } = useDealActions();
  const deals = data?.deals ?? [];
  const openValue = deals.filter((d) => !isClosedStage(d.stage as DealStage)).reduce((s, d) => s + d.valueInr, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <CrmPageHeader
        title="Deals"
        description={deals.length ? `${formatInr(openValue)} in open deals` : "Track opportunities from first contact to closed won."}
        actions={
          <Button onClick={() => openNew()} data-testid="button-add-deal">
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Add deal
          </Button>
        }
      />
      {error ? (
        <QueryError error={error} />
      ) : isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : deals.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No deals yet"
          description="Create a deal, or convert a qualified lead from the Leads page."
          action={
            <Button onClick={() => openNew()}>
              <Plus className="mr-2 h-4 w-4" aria-hidden /> Add your first deal
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm" data-testid="table-deals">
            <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Deal</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Expected close</th>
                <th className="w-12 px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {deals.map((deal) => (
                <tr key={deal.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{deal.title}</p>
                    {deal.contactName && <p className="text-xs text-muted-foreground">{deal.contactName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <DealStageBadge stage={deal.stage} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">{formatInr(deal.valueInr)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {deal.expectedCloseDate
                      ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{menu(deal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialogs}
    </div>
  );
}

export function PipelinePage() {
  const { data, isLoading, error } = useDeals();
  const { openNew, menu, dialogs, move } = useDealActions();
  const [dragOver, setDragOver] = useState<DealStage | null>(null);
  const deals = data?.deals ?? [];

  return (
    <div className="mx-auto max-w-[1600px]">
      <CrmPageHeader
        title="Sales Pipeline"
        description="Drag a deal to another stage, or use its menu to move it."
        actions={
          <Button onClick={() => openNew()} data-testid="button-add-deal">
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Add deal
          </Button>
        }
      />
      {error ? (
        <QueryError error={error} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
          <div className="grid min-w-[1140px] grid-cols-6 gap-3" data-testid="pipeline-board">
            {DEAL_STAGES.map((stage) => {
              const column = deals.filter((d) => d.stage === stage);
              const total = column.reduce((s, d) => s + d.valueInr, 0);
              return (
                <section
                  key={stage}
                  aria-label={DEAL_STAGE_LABELS[stage]}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(stage);
                  }}
                  onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = e.dataTransfer.getData("text/plain");
                    const deal = deals.find((d) => d.id === id);
                    if (deal && deal.stage !== stage) move.mutate({ id, stage });
                  }}
                  className={`flex min-h-[420px] flex-col rounded-xl border bg-muted/30 p-2.5 transition-colors ${
                    dragOver === stage ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <header className="mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STAGE_BAR_COLOR[stage] }} aria-hidden />
                      <h2 className="text-sm font-semibold text-foreground">{DEAL_STAGE_LABELS[stage]}</h2>
                      <span className="ml-auto rounded-full bg-background px-2 text-xs font-medium text-muted-foreground">
                        {column.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatInr(total)}</p>
                  </header>
                  <ul className="flex-1 space-y-2">
                    {column.map((deal) => (
                      <li
                        key={deal.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", deal.id)}
                        className="cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                        data-testid={`card-deal-${deal.id}`}
                      >
                        <div className="flex items-start gap-1">
                          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{deal.title}</p>
                          {menu(deal)}
                        </div>
                        {deal.contactName && <p className="text-xs text-muted-foreground">{deal.contactName}</p>}
                        <p className="mt-2 text-sm font-semibold text-foreground">{formatInr(deal.valueInr)}</p>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => openNew(stage)}
                    className="mt-2 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Add deal
                  </button>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {dialogs}
    </div>
  );
}
