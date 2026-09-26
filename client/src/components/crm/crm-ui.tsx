import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toLocalInputValue } from "@/lib/datetime";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  type DealStage,
  type LeadStatus,
} from "@shared/crm";
import type { CrmDeal, CrmLead, CrmTask } from "@shared/schema";

/* ------------------------------------------------------------ formatting */

export function formatInr(value: number | null | undefined): string {
  return `₹${Math.round(value ?? 0).toLocaleString("en-IN")}`;
}

const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today · 10:00 am", "Tomorrow · 4:00 pm", "Mon, 28 Sep · 11:00 am" (viewer's local time). */
export function formatDue(value: string | Date, now = new Date()): string {
  const date = new Date(value);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day = sameDay(date, now)
    ? "Today"
    : sameDay(date, tomorrow)
      ? "Tomorrow"
      : sameDay(date, yesterday)
        ? "Yesterday"
        : dayFmt.format(date);
  return `${day} · ${timeFmt.format(date)}`;
}

export function formatChange(pct: number | null): { label: string; tone: "up" | "down" | "flat" } {
  if (pct === null) return { label: "No data last month", tone: "flat" };
  if (pct === 0) return { label: "Same as last month", tone: "flat" };
  return { label: `${pct > 0 ? "+" : ""}${pct}% vs last month`, tone: pct > 0 ? "up" : "down" };
}

export { toLocalInputValue } from "@/lib/datetime";

/* ---------------------------------------------------------------- cache */

/** Every CRM query key starts with /api/crm; refresh them all after a write. */
export function invalidateCrm(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/crm"),
  });
}

export function useCrmMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  { success, onDone }: { success?: string; onDone?: () => void } = {},
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await invalidateCrm(queryClient);
      if (success) toast({ title: success });
      onDone?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Something needs attention",
        description: error.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });
}

/* ---------------------------------------------------------------- badges */

const LEAD_STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200",
  contacted: "bg-amber-50 text-amber-700 ring-amber-200",
  qualified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  unqualified: "bg-slate-100 text-slate-600 ring-slate-200",
  converted: "bg-teal-50 text-teal-800 ring-teal-200",
};

const DEAL_STAGE_TONE: Record<DealStage, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200",
  contacted: "bg-amber-50 text-amber-700 ring-amber-200",
  proposal: "bg-violet-50 text-violet-700 ring-violet-200",
  negotiation: "bg-orange-50 text-orange-700 ring-orange-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const STAGE_BAR_COLOR: Record<DealStage, string> = {
  new: "#5EEAD4",
  contacted: "#2DD4BF",
  proposal: "#14B8A6",
  negotiation: "#0E8C7F",
  won: "#22C55E",
  lost: "#F43F5E",
};

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${className}`}>
      {children}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: string }) {
  const s = status as LeadStatus;
  return <Pill className={LEAD_STATUS_TONE[s] ?? LEAD_STATUS_TONE.new}>{LEAD_STATUS_LABELS[s] ?? status}</Pill>;
}

export function DealStageBadge({ stage }: { stage: string }) {
  const s = stage as DealStage;
  return <Pill className={DEAL_STAGE_TONE[s] ?? DEAL_STAGE_TONE.new}>{DEAL_STAGE_LABELS[s] ?? stage}</Pill>;
}

export function ComingSoonBadge({ label = "Coming soon" }: { label?: string }) {
  return <Pill className="bg-slate-50 text-slate-500 ring-slate-200">{label}</Pill>;
}

/* ---------------------------------------------------------------- layout */

export function CrmPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="font-heading font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function QueryError({ error }: { error: unknown }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
      Couldn&apos;t load this data: {String((error as Error)?.message ?? error).replace(/^\d+:\s*/, "")}
    </div>
  );
}

/* ---------------------------------------------------------------- forms */

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  allowNone,
}: {
  id: string;
  label: string;
  value: T | "";
  onChange: (v: T | "") => void;
  options: { value: T; label: string }[];
  allowNone?: string;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : (v as T))}>
        <SelectTrigger id={id} data-testid={`select-${id}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="__none">{allowNone}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  pending,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  pending: boolean;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="my-5 grid gap-4">{children}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} data-testid="button-save">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const emptyLead = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "manual" as string,
  status: "new" as string,
  estimatedValueInr: "",
  notes: "",
};

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: CrmLead | null;
}) {
  const [form, setForm] = useState(emptyLead);
  useEffect(() => {
    if (!open) return;
    setForm(
      lead
        ? {
            name: lead.name,
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            company: lead.company ?? "",
            source: lead.source,
            status: lead.status,
            estimatedValueInr: lead.estimatedValueInr == null ? "" : String(lead.estimatedValueInr),
            notes: lead.notes ?? "",
          }
        : emptyLead,
    );
  }, [open, lead]);

  const save = useCrmMutation(
    () => {
      const body = { ...form, estimatedValueInr: form.estimatedValueInr === "" ? null : form.estimatedValueInr };
      return lead ? apiRequest("PATCH", `/api/crm/leads/${lead.id}`, body) : apiRequest("POST", "/api/crm/leads", body);
    },
    { success: lead ? "Lead updated" : "Lead added", onDone: () => onOpenChange(false) },
  );
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={lead ? "Edit lead" : "Add lead"}
      description="Leads are private to your workspace."
      submitLabel={lead ? "Save changes" : "Add lead"}
      pending={save.isPending}
      onSubmit={() => save.mutate(undefined)}
    >
      <Field label="Name *" htmlFor="lead-name">
        <Input id="lead-name" value={form.name} onChange={set("name")} required maxLength={200} data-testid="input-lead-name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="lead-phone">
          <Input id="lead-phone" value={form.phone} onChange={set("phone")} maxLength={32} inputMode="tel" />
        </Field>
        <Field label="Email" htmlFor="lead-email">
          <Input id="lead-email" type="email" value={form.email} onChange={set("email")} maxLength={254} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="lead-company">
          <Input id="lead-company" value={form.company} onChange={set("company")} maxLength={200} />
        </Field>
        <Field label="Estimated value (₹)" htmlFor="lead-value">
          <Input id="lead-value" type="number" min={0} step={1} value={form.estimatedValueInr} onChange={set("estimatedValueInr")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="lead-source"
          label="Source"
          value={form.source}
          onChange={(v) => setForm((f) => ({ ...f, source: v || "manual" }))}
          options={LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] }))}
        />
        <SelectField
          id="lead-status"
          label="Status"
          value={form.status}
          onChange={(v) => setForm((f) => ({ ...f, status: v || "new" }))}
          options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
        />
      </div>
      <Field label="Notes" htmlFor="lead-notes">
        <Textarea id="lead-notes" value={form.notes} onChange={set("notes")} rows={3} maxLength={5000} />
      </Field>
    </FormDialog>
  );
}

const emptyDeal = { title: "", contactName: "", valueInr: "", stage: "new" as string, expectedCloseDate: "", notes: "" };

export function DealFormDialog({
  open,
  onOpenChange,
  deal,
  defaultStage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: CrmDeal | null;
  defaultStage?: DealStage;
}) {
  const [form, setForm] = useState(emptyDeal);
  useEffect(() => {
    if (!open) return;
    setForm(
      deal
        ? {
            title: deal.title,
            contactName: deal.contactName ?? "",
            valueInr: String(deal.valueInr ?? 0),
            stage: deal.stage,
            expectedCloseDate: deal.expectedCloseDate ? toLocalInputValue(deal.expectedCloseDate).slice(0, 10) : "",
            notes: deal.notes ?? "",
          }
        : { ...emptyDeal, stage: defaultStage ?? "new" },
    );
  }, [open, deal, defaultStage]);

  const save = useCrmMutation(
    () => {
      const body = {
        ...form,
        valueInr: form.valueInr === "" ? 0 : form.valueInr,
        expectedCloseDate: form.expectedCloseDate ? new Date(`${form.expectedCloseDate}T00:00:00`).toISOString() : null,
      };
      return deal ? apiRequest("PATCH", `/api/crm/deals/${deal.id}`, body) : apiRequest("POST", "/api/crm/deals", body);
    },
    { success: deal ? "Deal updated" : "Deal added", onDone: () => onOpenChange(false) },
  );
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={deal ? "Edit deal" : "Add deal"}
      submitLabel={deal ? "Save changes" : "Add deal"}
      pending={save.isPending}
      onSubmit={() => save.mutate(undefined)}
    >
      <Field label="Deal title *" htmlFor="deal-title">
        <Input id="deal-title" value={form.title} onChange={set("title")} required maxLength={200} data-testid="input-deal-title" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact" htmlFor="deal-contact">
          <Input id="deal-contact" value={form.contactName} onChange={set("contactName")} maxLength={200} />
        </Field>
        <Field label="Value (₹)" htmlFor="deal-value">
          <Input id="deal-value" type="number" min={0} step={1} value={form.valueInr} onChange={set("valueInr")} data-testid="input-deal-value" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="deal-stage"
          label="Stage"
          value={form.stage}
          onChange={(v) => setForm((f) => ({ ...f, stage: v || "new" }))}
          options={DEAL_STAGES.map((s) => ({ value: s, label: DEAL_STAGE_LABELS[s] }))}
        />
        <Field label="Expected close" htmlFor="deal-close">
          <Input id="deal-close" type="date" value={form.expectedCloseDate} onChange={set("expectedCloseDate")} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="deal-notes">
        <Textarea id="deal-notes" value={form.notes} onChange={set("notes")} rows={3} maxLength={5000} />
      </Field>
    </FormDialog>
  );
}

function defaultDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInputValue(d);
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultType = "follow_up",
  leadId,
  dealId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: CrmTask | null;
  defaultType?: string;
  leadId?: string | null;
  dealId?: string | null;
}) {
  const [form, setForm] = useState({ title: "", type: defaultType, dueAt: defaultDue(), leadId: "", dealId: "", notes: "" });
  // Options for linking; only this workspace's rows come back from the API.
  const { data: leadsData } = useQuery<{ leads: CrmLead[] }>({ queryKey: ["/api/crm/leads"], enabled: open });
  const { data: dealsData } = useQuery<{ deals: CrmDeal[] }>({ queryKey: ["/api/crm/deals"], enabled: open });

  useEffect(() => {
    if (!open) return;
    setForm(
      task
        ? {
            title: task.title,
            type: task.type,
            dueAt: toLocalInputValue(task.dueAt),
            leadId: task.leadId ?? "",
            dealId: task.dealId ?? "",
            notes: task.notes ?? "",
          }
        : { title: "", type: defaultType, dueAt: defaultDue(), leadId: leadId ?? "", dealId: dealId ?? "", notes: "" },
    );
  }, [open, task, defaultType, leadId, dealId]);

  const save = useCrmMutation(
    () => {
      const body = {
        ...form,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : "",
        leadId: form.leadId || null,
        dealId: form.dealId || null,
      };
      return task ? apiRequest("PATCH", `/api/crm/tasks/${task.id}`, body) : apiRequest("POST", "/api/crm/tasks", body);
    },
    { success: task ? "Saved" : defaultType === "task" ? "Task added" : "Follow-up scheduled", onDone: () => onOpenChange(false) },
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={task ? "Edit" : defaultType === "task" ? "Add task" : "Schedule follow-up"}
      submitLabel={task ? "Save changes" : "Save"}
      pending={save.isPending}
      onSubmit={() => save.mutate(undefined)}
    >
      <Field label="What needs to happen? *" htmlFor="task-title">
        <Input
          id="task-title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          maxLength={200}
          placeholder="e.g. Call to confirm site visit"
          data-testid="input-task-title"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="task-type"
          label="Type"
          value={form.type}
          onChange={(v) => setForm((f) => ({ ...f, type: v || "follow_up" }))}
          options={TASK_TYPES.map((t) => ({ value: t, label: TASK_TYPE_LABELS[t] }))}
        />
        <Field label="Due *" htmlFor="task-due">
          <Input
            id="task-due"
            type="datetime-local"
            value={form.dueAt}
            onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
            required
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="task-lead"
          label="Lead"
          value={form.leadId}
          onChange={(v) => setForm((f) => ({ ...f, leadId: v }))}
          allowNone="No lead"
          options={(leadsData?.leads ?? []).map((l) => ({ value: l.id, label: l.name }))}
        />
        <SelectField
          id="task-deal"
          label="Deal"
          value={form.dealId}
          onChange={(v) => setForm((f) => ({ ...f, dealId: v }))}
          allowNone="No deal"
          options={(dealsData?.deals ?? []).map((d) => ({ value: d.id, label: d.title }))}
        />
      </div>
      <Field label="Notes" htmlFor="task-notes">
        <Textarea
          id="task-notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          maxLength={5000}
        />
      </Field>
    </FormDialog>
  );
}
