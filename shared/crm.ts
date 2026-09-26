import { z } from "zod";

/**
 * CRM domain definitions shared by the API (validation) and the client
 * (forms, labels). Stored values are the array entries; labels are display-only.
 */

export const LEAD_STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  unqualified: "Unqualified",
  converted: "Converted",
};

export const LEAD_SOURCES = [
  "website",
  "whatsapp",
  "facebook_ads",
  "google_ads",
  "referral",
  "walk_in",
  "phone",
  "manual",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  facebook_ads: "Facebook Ads",
  google_ads: "Google Ads",
  referral: "Referral",
  walk_in: "Walk-in",
  phone: "Phone call",
  manual: "Added manually",
  other: "Other",
};

/** Deal stages in pipeline order; "won" and "lost" are the closed stages. */
export const DEAL_STAGES = ["new", "contacted", "proposal", "negotiation", "won", "lost"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: "New Leads",
  contacted: "Contacted",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Closed Won",
  lost: "Closed Lost",
};
export const CLOSED_DEAL_STAGES: readonly DealStage[] = ["won", "lost"];
/** Stages shown as pipeline columns / dashboard bars (lost deals are excluded). */
export const PIPELINE_STAGES: readonly DealStage[] = ["new", "contacted", "proposal", "negotiation", "won"];

export function isClosedStage(stage: DealStage): boolean {
  return CLOSED_DEAL_STAGES.includes(stage);
}

export const TASK_TYPES = ["call", "meeting", "follow_up", "email", "task"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call: "Call",
  meeting: "Meeting",
  follow_up: "Follow-up",
  email: "Email",
  task: "Task",
};
/** Task types that count as customer follow-ups (everything except internal to-dos). */
export const FOLLOW_UP_TYPES: readonly TaskType[] = ["call", "meeting", "follow_up", "email"];

/* ---------------------------------------------------------------- schemas */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const amountInr = z.coerce
  .number({ invalid_type_error: "Enter an amount in rupees" })
  .int("Use whole rupees")
  .min(0, "Amount can't be negative")
  // Stored in a Postgres integer column (max ~2.1 billion).
  .max(2_000_000_000, "Amount is too large");

const optionalDate = z
  .union([z.coerce.date(), z.null()])
  .optional()
  .refine((d) => d === undefined || d === null || !Number.isNaN(d.getTime()), "Invalid date");

const optionalId = z.string().trim().min(1).max(64).optional().nullable().transform((v) => v || null);

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .nullable()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.string().email().safeParse(v).success, "Enter a valid email"),
  phone: optionalText(32),
  company: optionalText(200),
  source: z.enum(LEAD_SOURCES).default("manual"),
  status: z.enum(LEAD_STATUSES).default("new"),
  estimatedValueInr: amountInr.optional().nullable().transform((v) => v ?? null),
  notes: optionalText(5000),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial();
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const createDealSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  contactName: optionalText(200),
  valueInr: amountInr.default(0),
  stage: z.enum(DEAL_STAGES).default("new"),
  expectedCloseDate: optionalDate,
  leadId: optionalId,
  notes: optionalText(5000),
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = createDealSchema.partial();
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.enum(TASK_TYPES).default("follow_up"),
  dueAt: z.coerce.date({ invalid_type_error: "Pick a due date" }).refine((d) => !Number.isNaN(d.getTime()), "Pick a due date"),
  leadId: optionalId,
  dealId: optionalId,
  notes: optionalText(5000),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().extend({
  completed: z.boolean().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/* ------------------------------------------------------------ API shapes */

export type CrmIntegrationStatus = {
  id: string;
  name: string;
  status: "connected" | "available" | "coming_soon";
  detail: string;
};

export type CrmDashboardSummary = {
  totalLeads: number;
  leadsThisMonth: number;
  leadsChangePct: number | null;
  activeDeals: number;
  activeDealsValueInr: number;
  wonThisMonth: number;
  wonChangePct: number | null;
  revenueThisMonthInr: number;
  revenueChangePct: number | null;
  pipeline: { stage: DealStage; label: string; count: number; valueInr: number }[];
  upcomingFollowUps: {
    id: string;
    title: string;
    type: TaskType;
    dueAt: string;
    overdue: boolean;
    leadName: string | null;
  }[];
  recentLeads: {
    id: string;
    name: string;
    source: LeadSource;
    status: LeadStatus;
    nextAction: string | null;
    createdAt: string;
  }[];
  integrations: CrmIntegrationStatus[];
};

/**
 * Integrations that are planned but NOT built yet. The API reports them as
 * "coming_soon"; move an entry out of this list only once it really works.
 */
export const PLANNED_INTEGRATIONS: { id: string; name: string }[] = [
  { id: "gmail", name: "Gmail" },
  { id: "facebook-leads", name: "Facebook Leads" },
  { id: "google", name: "Google Ads" },
  { id: "google-calendar", name: "Google Calendar" },
  { id: "forms", name: "Web Forms" },
  { id: "slack", name: "Slack" },
  { id: "zapier", name: "Zapier" },
  { id: "hubspot", name: "HubSpot" },
];
