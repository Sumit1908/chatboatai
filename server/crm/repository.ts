import { and, asc, desc, eq, ilike, inArray, isNull, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { crmDeals, crmLeads, crmTasks, type CrmDeal, type CrmLead, type CrmTask } from "@shared/schema";
import {
  CLOSED_DEAL_STAGES,
  DEAL_STAGE_LABELS,
  FOLLOW_UP_TYPES,
  PIPELINE_STAGES,
  type CreateDealInput,
  type CreateLeadInput,
  type CreateTaskInput,
  type CrmDashboardSummary,
  type CrmIntegrationStatus,
  type DealStage,
  type LeadSource,
  type LeadStatus,
  type TaskType,
  type UpdateDealInput,
  type UpdateLeadInput,
  type UpdateTaskInput,
} from "@shared/crm";
import { closedAtForStageChange, monthBoundsIst, percentChange, startOfTodayIst, toCount } from "./metrics";

/**
 * Tenant-scoped CRM data access. EVERY query here filters by owner_user_id;
 * a row owned by someone else behaves exactly like a missing row (callers
 * answer 404), and cross-references (deal -> lead, task -> lead/deal) are
 * only accepted when the referenced row has the same owner.
 *
 * Takes the database as a parameter so tests can run it against an
 * in-memory Postgres (PGlite) - see repository.test.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CrmDb = PgDatabase<PgQueryResultHKT, any, any>;

/**
 * A UTC instant as a `timestamp` literal for raw SQL fragments. The crm_*
 * columns are `timestamp without time zone` holding UTC wall time (drizzle
 * writes Date.toISOString()); passing a JS Date straight into sql`` would
 * send the server's *local* time instead and shift every month boundary.
 */
function ts(date: Date): SQL {
  return sql`${date.toISOString()}::timestamp`;
}

/** Thrown for a reference to a lead/deal the owner can't see; routes map it to 400. */
export class CrmReferenceError extends Error {}

/** Same DDL as the crm_* tables in shared/schema.ts - keep in sync. */
export async function ensureCrmTables(db: CrmDb): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS crm_leads (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id varchar NOT NULL,
      name varchar(200) NOT NULL,
      email varchar(254),
      phone varchar(32),
      company varchar(200),
      source varchar(32) NOT NULL DEFAULT 'manual',
      status varchar(32) NOT NULL DEFAULT 'new',
      estimated_value_inr integer,
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS crm_leads_owner_created_idx ON crm_leads (owner_user_id, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS crm_leads_owner_status_idx ON crm_leads (owner_user_id, status)`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS crm_deals (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id varchar NOT NULL,
      lead_id varchar,
      title varchar(200) NOT NULL,
      contact_name varchar(200),
      value_inr integer NOT NULL DEFAULT 0,
      stage varchar(32) NOT NULL DEFAULT 'new',
      expected_close_date timestamp,
      closed_at timestamp,
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS crm_deals_owner_stage_idx ON crm_deals (owner_user_id, stage)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS crm_deals_owner_closed_idx ON crm_deals (owner_user_id, closed_at)`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id varchar NOT NULL,
      lead_id varchar,
      deal_id varchar,
      title varchar(200) NOT NULL,
      type varchar(32) NOT NULL DEFAULT 'follow_up',
      due_at timestamp NOT NULL,
      completed_at timestamp,
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS crm_tasks_owner_due_idx ON crm_tasks (owner_user_id, due_at)`);
}

export type TaskScope = "follow_ups" | "tasks" | "all";
export type TaskStatusFilter = "open" | "done" | "all";

export function createCrmRepository(db: CrmDb) {
  async function assertLeadOwned(owner: string, leadId: string | null | undefined) {
    if (!leadId) return;
    const [row] = await db
      .select({ id: crmLeads.id })
      .from(crmLeads)
      .where(and(eq(crmLeads.id, leadId), eq(crmLeads.ownerUserId, owner)))
      .limit(1);
    if (!row) throw new CrmReferenceError("Lead not found");
  }

  async function assertDealOwned(owner: string, dealId: string | null | undefined) {
    if (!dealId) return;
    const [row] = await db
      .select({ id: crmDeals.id })
      .from(crmDeals)
      .where(and(eq(crmDeals.id, dealId), eq(crmDeals.ownerUserId, owner)))
      .limit(1);
    if (!row) throw new CrmReferenceError("Deal not found");
  }

  /* ------------------------------------------------------------ leads */

  async function listLeads(
    owner: string,
    opts: { status?: LeadStatus; search?: string; limit?: number } = {},
  ): Promise<CrmLead[]> {
    const conditions: SQL[] = [eq(crmLeads.ownerUserId, owner)];
    if (opts.status) conditions.push(eq(crmLeads.status, opts.status));
    const search = opts.search?.trim();
    if (search) {
      const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      conditions.push(
        or(
          ilike(crmLeads.name, like),
          ilike(crmLeads.email, like),
          ilike(crmLeads.phone, like),
          ilike(crmLeads.company, like),
        )!,
      );
    }
    return db
      .select()
      .from(crmLeads)
      .where(and(...conditions))
      .orderBy(desc(crmLeads.createdAt))
      .limit(Math.min(opts.limit ?? 500, 1000));
  }

  async function getLead(owner: string, id: string): Promise<CrmLead | undefined> {
    const [row] = await db
      .select()
      .from(crmLeads)
      .where(and(eq(crmLeads.id, id), eq(crmLeads.ownerUserId, owner)))
      .limit(1);
    return row;
  }

  async function createLead(owner: string, input: CreateLeadInput): Promise<CrmLead> {
    const [row] = await db
      .insert(crmLeads)
      .values({ ...input, ownerUserId: owner })
      .returning();
    return row;
  }

  async function updateLead(owner: string, id: string, input: UpdateLeadInput): Promise<CrmLead | undefined> {
    const [row] = await db
      .update(crmLeads)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(crmLeads.id, id), eq(crmLeads.ownerUserId, owner)))
      .returning();
    return row;
  }

  async function deleteLead(owner: string, id: string): Promise<boolean> {
    const [row] = await db
      .delete(crmLeads)
      .where(and(eq(crmLeads.id, id), eq(crmLeads.ownerUserId, owner)))
      .returning({ id: crmLeads.id });
    if (!row) return false;
    // Keep deals/tasks, just unlink them from the deleted lead.
    await db
      .update(crmDeals)
      .set({ leadId: null, updatedAt: new Date() })
      .where(and(eq(crmDeals.ownerUserId, owner), eq(crmDeals.leadId, id)));
    await db
      .update(crmTasks)
      .set({ leadId: null, updatedAt: new Date() })
      .where(and(eq(crmTasks.ownerUserId, owner), eq(crmTasks.leadId, id)));
    return true;
  }

  /** Creates an open deal from a lead and marks the lead converted. */
  async function convertLeadToDeal(owner: string, leadId: string): Promise<CrmDeal | undefined> {
    const lead = await getLead(owner, leadId);
    if (!lead) return undefined;
    const [deal] = await db
      .insert(crmDeals)
      .values({
        ownerUserId: owner,
        leadId: lead.id,
        title: lead.company ? `${lead.company} — ${lead.name}` : lead.name,
        contactName: lead.name,
        valueInr: lead.estimatedValueInr ?? 0,
        stage: "new",
      })
      .returning();
    await db
      .update(crmLeads)
      .set({ status: "converted", updatedAt: new Date() })
      .where(and(eq(crmLeads.id, lead.id), eq(crmLeads.ownerUserId, owner)));
    return deal;
  }

  /* ------------------------------------------------------------ deals */

  async function listDeals(owner: string, opts: { stage?: DealStage } = {}): Promise<CrmDeal[]> {
    const conditions: SQL[] = [eq(crmDeals.ownerUserId, owner)];
    if (opts.stage) conditions.push(eq(crmDeals.stage, opts.stage));
    return db
      .select()
      .from(crmDeals)
      .where(and(...conditions))
      .orderBy(desc(crmDeals.updatedAt))
      .limit(1000);
  }

  async function getDeal(owner: string, id: string): Promise<CrmDeal | undefined> {
    const [row] = await db
      .select()
      .from(crmDeals)
      .where(and(eq(crmDeals.id, id), eq(crmDeals.ownerUserId, owner)))
      .limit(1);
    return row;
  }

  async function createDeal(owner: string, input: CreateDealInput, now = new Date()): Promise<CrmDeal> {
    await assertLeadOwned(owner, input.leadId);
    const [row] = await db
      .insert(crmDeals)
      .values({
        ...input,
        expectedCloseDate: input.expectedCloseDate ?? null,
        ownerUserId: owner,
        closedAt: closedAtForStageChange(null, input.stage, null, now),
      })
      .returning();
    return row;
  }

  async function updateDeal(
    owner: string,
    id: string,
    input: UpdateDealInput,
    now = new Date(),
  ): Promise<CrmDeal | undefined> {
    const existing = await getDeal(owner, id);
    if (!existing) return undefined;
    if (input.leadId !== undefined) await assertLeadOwned(owner, input.leadId);
    const patch: Partial<CrmDeal> = { ...input, updatedAt: now };
    if (input.stage !== undefined) {
      patch.closedAt = closedAtForStageChange(existing.stage as DealStage, input.stage, existing.closedAt, now);
    }
    const [row] = await db
      .update(crmDeals)
      .set(patch)
      .where(and(eq(crmDeals.id, id), eq(crmDeals.ownerUserId, owner)))
      .returning();
    return row;
  }

  async function deleteDeal(owner: string, id: string): Promise<boolean> {
    const [row] = await db
      .delete(crmDeals)
      .where(and(eq(crmDeals.id, id), eq(crmDeals.ownerUserId, owner)))
      .returning({ id: crmDeals.id });
    if (!row) return false;
    await db
      .update(crmTasks)
      .set({ dealId: null, updatedAt: new Date() })
      .where(and(eq(crmTasks.ownerUserId, owner), eq(crmTasks.dealId, id)));
    return true;
  }

  /* ------------------------------------------------------------ tasks */

  async function listTasks(
    owner: string,
    opts: { scope?: TaskScope; status?: TaskStatusFilter; leadId?: string; dealId?: string } = {},
  ): Promise<(CrmTask & { leadName: string | null; dealTitle: string | null })[]> {
    const conditions: SQL[] = [eq(crmTasks.ownerUserId, owner)];
    if (opts.scope === "follow_ups") conditions.push(inArray(crmTasks.type, [...FOLLOW_UP_TYPES]));
    if (opts.scope === "tasks") conditions.push(eq(crmTasks.type, "task"));
    if (opts.status === "open") conditions.push(isNull(crmTasks.completedAt));
    if (opts.status === "done") conditions.push(sql`${crmTasks.completedAt} IS NOT NULL`);
    if (opts.leadId) conditions.push(eq(crmTasks.leadId, opts.leadId));
    if (opts.dealId) conditions.push(eq(crmTasks.dealId, opts.dealId));
    // Joins also filter by owner, so a stale cross-tenant id can never pull
    // another workspace's lead name or deal title into the result.
    const rows = await db
      .select({ task: crmTasks, leadName: crmLeads.name, dealTitle: crmDeals.title })
      .from(crmTasks)
      .leftJoin(crmLeads, and(eq(crmLeads.id, crmTasks.leadId), eq(crmLeads.ownerUserId, owner)))
      .leftJoin(crmDeals, and(eq(crmDeals.id, crmTasks.dealId), eq(crmDeals.ownerUserId, owner)))
      .where(and(...conditions))
      .orderBy(opts.status === "done" ? desc(crmTasks.completedAt) : asc(crmTasks.dueAt))
      .limit(1000);
    return rows.map((r) => ({ ...r.task, leadName: r.leadName ?? null, dealTitle: r.dealTitle ?? null }));
  }

  async function createTask(owner: string, input: CreateTaskInput): Promise<CrmTask> {
    await assertLeadOwned(owner, input.leadId);
    await assertDealOwned(owner, input.dealId);
    const [row] = await db
      .insert(crmTasks)
      .values({ ...input, ownerUserId: owner })
      .returning();
    return row;
  }

  async function updateTask(
    owner: string,
    id: string,
    input: UpdateTaskInput,
    now = new Date(),
  ): Promise<CrmTask | undefined> {
    if (input.leadId !== undefined) await assertLeadOwned(owner, input.leadId);
    if (input.dealId !== undefined) await assertDealOwned(owner, input.dealId);
    const { completed, ...fields } = input;
    const patch: Partial<CrmTask> = { ...fields, updatedAt: now };
    if (completed !== undefined) patch.completedAt = completed ? now : null;
    const [row] = await db
      .update(crmTasks)
      .set(patch)
      .where(and(eq(crmTasks.id, id), eq(crmTasks.ownerUserId, owner)))
      .returning();
    return row;
  }

  async function deleteTask(owner: string, id: string): Promise<boolean> {
    const [row] = await db
      .delete(crmTasks)
      .where(and(eq(crmTasks.id, id), eq(crmTasks.ownerUserId, owner)))
      .returning({ id: crmTasks.id });
    return !!row;
  }

  /* -------------------------------------------------------- dashboard */

  async function getDashboardSummary(
    owner: string,
    integrations: CrmIntegrationStatus[],
    now = new Date(),
  ): Promise<CrmDashboardSummary> {
    const { lastMonthStart, thisMonthStart, nextMonthStart } = monthBoundsIst(now);
    const todayStart = startOfTodayIst(now);

    const [leadCounts] = await db
      .select({
        total: sql<string>`count(*)`,
        thisMonth: sql<string>`count(*) filter (where ${crmLeads.createdAt} >= ${ts(thisMonthStart)} and ${crmLeads.createdAt} < ${ts(nextMonthStart)})`,
        lastMonth: sql<string>`count(*) filter (where ${crmLeads.createdAt} >= ${ts(lastMonthStart)} and ${crmLeads.createdAt} < ${ts(thisMonthStart)})`,
      })
      .from(crmLeads)
      .where(eq(crmLeads.ownerUserId, owner));

    const [dealCounts] = await db
      .select({
        active: sql<string>`count(*) filter (where ${notInArray(crmDeals.stage, [...CLOSED_DEAL_STAGES])})`,
        activeValue: sql<string>`coalesce(sum(${crmDeals.valueInr}) filter (where ${notInArray(crmDeals.stage, [...CLOSED_DEAL_STAGES])}), 0)`,
        wonThisMonth: sql<string>`count(*) filter (where ${crmDeals.stage} = 'won' and ${crmDeals.closedAt} >= ${ts(thisMonthStart)} and ${crmDeals.closedAt} < ${ts(nextMonthStart)})`,
        wonLastMonth: sql<string>`count(*) filter (where ${crmDeals.stage} = 'won' and ${crmDeals.closedAt} >= ${ts(lastMonthStart)} and ${crmDeals.closedAt} < ${ts(thisMonthStart)})`,
        revenueThisMonth: sql<string>`coalesce(sum(${crmDeals.valueInr}) filter (where ${crmDeals.stage} = 'won' and ${crmDeals.closedAt} >= ${ts(thisMonthStart)} and ${crmDeals.closedAt} < ${ts(nextMonthStart)}), 0)`,
        revenueLastMonth: sql<string>`coalesce(sum(${crmDeals.valueInr}) filter (where ${crmDeals.stage} = 'won' and ${crmDeals.closedAt} >= ${ts(lastMonthStart)} and ${crmDeals.closedAt} < ${ts(thisMonthStart)}), 0)`,
      })
      .from(crmDeals)
      .where(eq(crmDeals.ownerUserId, owner));

    const stageRows = await db
      .select({
        stage: crmDeals.stage,
        count: sql<string>`count(*)`,
        value: sql<string>`coalesce(sum(${crmDeals.valueInr}), 0)`,
      })
      .from(crmDeals)
      .where(and(eq(crmDeals.ownerUserId, owner), ne(crmDeals.stage, "lost")))
      .groupBy(crmDeals.stage);
    const byStage = new Map(stageRows.map((r) => [r.stage, r]));

    const followUps = await db
      .select({ task: crmTasks, leadName: crmLeads.name })
      .from(crmTasks)
      .leftJoin(crmLeads, and(eq(crmLeads.id, crmTasks.leadId), eq(crmLeads.ownerUserId, owner)))
      .where(
        and(
          eq(crmTasks.ownerUserId, owner),
          isNull(crmTasks.completedAt),
          inArray(crmTasks.type, [...FOLLOW_UP_TYPES]),
        ),
      )
      .orderBy(asc(crmTasks.dueAt))
      .limit(5);

    const recent = await db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.ownerUserId, owner))
      .orderBy(desc(crmLeads.createdAt))
      .limit(5);

    // Next open task per recent lead, for the "Next Action" column.
    const nextTaskByLead = new Map<string, string>();
    if (recent.length > 0) {
      const tasks = await db
        .select({ leadId: crmTasks.leadId, title: crmTasks.title })
        .from(crmTasks)
        .where(
          and(
            eq(crmTasks.ownerUserId, owner),
            isNull(crmTasks.completedAt),
            inArray(
              crmTasks.leadId,
              recent.map((l) => l.id),
            ),
          ),
        )
        .orderBy(asc(crmTasks.dueAt));
      for (const t of tasks) {
        if (t.leadId && !nextTaskByLead.has(t.leadId)) nextTaskByLead.set(t.leadId, t.title);
      }
    }

    const wonThisMonth = toCount(dealCounts?.wonThisMonth);
    const revenueThisMonth = toCount(dealCounts?.revenueThisMonth);
    const leadsThisMonth = toCount(leadCounts?.thisMonth);

    return {
      totalLeads: toCount(leadCounts?.total),
      leadsThisMonth,
      leadsChangePct: percentChange(leadsThisMonth, toCount(leadCounts?.lastMonth)),
      activeDeals: toCount(dealCounts?.active),
      activeDealsValueInr: toCount(dealCounts?.activeValue),
      wonThisMonth,
      wonChangePct: percentChange(wonThisMonth, toCount(dealCounts?.wonLastMonth)),
      revenueThisMonthInr: revenueThisMonth,
      revenueChangePct: percentChange(revenueThisMonth, toCount(dealCounts?.revenueLastMonth)),
      pipeline: PIPELINE_STAGES.map((stage) => ({
        stage,
        label: DEAL_STAGE_LABELS[stage],
        count: toCount(byStage.get(stage)?.count),
        valueInr: toCount(byStage.get(stage)?.value),
      })),
      upcomingFollowUps: followUps.map(({ task, leadName }) => ({
        id: task.id,
        title: task.title,
        type: task.type as TaskType,
        dueAt: task.dueAt.toISOString(),
        overdue: task.dueAt < todayStart,
        leadName: leadName ?? null,
      })),
      recentLeads: recent.map((lead) => ({
        id: lead.id,
        name: lead.name,
        source: lead.source as LeadSource,
        status: lead.status as LeadStatus,
        nextAction: nextTaskByLead.get(lead.id) ?? null,
        createdAt: lead.createdAt.toISOString(),
      })),
      integrations,
    };
  }

  return {
    listLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    convertLeadToDeal,
    listDeals,
    getDeal,
    createDeal,
    updateDeal,
    deleteDeal,
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    getDashboardSummary,
  };
}

export type CrmRepository = ReturnType<typeof createCrmRepository>;

