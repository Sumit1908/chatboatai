import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { CrmReferenceError, createCrmRepository, ensureCrmTables, type CrmDb } from "./repository";

/**
 * Runs the real repository against an in-memory Postgres (PGlite), with two
 * workspaces, to prove tenant isolation - the property the whole CRM API
 * relies on - rather than trusting the WHERE clauses by eye.
 */

const ALICE = "user-alice";
const BOB = "user-bob";
const NOW = new Date("2026-09-25T10:00:00Z");

let db: CrmDb;
let repo: ReturnType<typeof createCrmRepository>;

// One in-memory database per file (booting PGlite takes seconds), wiped
// between tests.
beforeAll(async () => {
  db = drizzle(new PGlite()) as unknown as CrmDb;
  await ensureCrmTables(db);
  repo = createCrmRepository(db);
}, 60_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE crm_leads, crm_deals, crm_tasks`);
});

describe("tenant isolation", () => {
  it("never returns, updates or deletes another workspace's lead", async () => {
    const bobLead = await repo.createLead(BOB, {
      name: "Bob's lead", email: null, phone: null, company: null,
      source: "website", status: "new", estimatedValueInr: null, notes: null,
    });

    expect(await repo.listLeads(ALICE)).toEqual([]);
    expect(await repo.getLead(ALICE, bobLead.id)).toBeUndefined();
    expect(await repo.updateLead(ALICE, bobLead.id, { name: "hijacked" })).toBeUndefined();
    expect(await repo.deleteLead(ALICE, bobLead.id)).toBe(false);
    expect(await repo.convertLeadToDeal(ALICE, bobLead.id)).toBeUndefined();

    // Bob's lead is untouched.
    expect((await repo.getLead(BOB, bobLead.id))?.name).toBe("Bob's lead");
    expect(await repo.listDeals(ALICE)).toEqual([]);
  });

  it("isolates deals and tasks the same way", async () => {
    const bobDeal = await repo.createDeal(BOB, { title: "Bob's deal", valueInr: 5000, stage: "proposal" });
    const bobTask = await repo.createTask(BOB, { title: "Call Bob's client", type: "call", dueAt: NOW });

    expect(await repo.listDeals(ALICE)).toEqual([]);
    expect(await repo.updateDeal(ALICE, bobDeal.id, { stage: "won" })).toBeUndefined();
    expect(await repo.deleteDeal(ALICE, bobDeal.id)).toBe(false);
    expect(await repo.listTasks(ALICE)).toEqual([]);
    expect(await repo.updateTask(ALICE, bobTask.id, { completed: true })).toBeUndefined();
    expect(await repo.deleteTask(ALICE, bobTask.id)).toBe(false);

    expect((await repo.getDeal(BOB, bobDeal.id))?.stage).toBe("proposal");
    expect((await repo.listTasks(BOB))[0].completedAt).toBeNull();
  });

  it("refuses to link records to another workspace's lead or deal", async () => {
    const bobLead = await repo.createLead(BOB, {
      name: "Bob's lead", email: null, phone: null, company: null,
      source: "manual", status: "new", estimatedValueInr: null, notes: null,
    });
    const bobDeal = await repo.createDeal(BOB, { title: "Bob's deal", valueInr: 0, stage: "new" });
    const aliceDeal = await repo.createDeal(ALICE, { title: "Alice's deal", valueInr: 0, stage: "new" });

    await expect(repo.createDeal(ALICE, { title: "x", valueInr: 0, stage: "new", leadId: bobLead.id }))
      .rejects.toBeInstanceOf(CrmReferenceError);
    await expect(repo.createTask(ALICE, { title: "x", type: "call", dueAt: NOW, dealId: bobDeal.id }))
      .rejects.toBeInstanceOf(CrmReferenceError);
    await expect(repo.updateDeal(ALICE, aliceDeal.id, { leadId: bobLead.id }))
      .rejects.toBeInstanceOf(CrmReferenceError);
  });

  it("builds each dashboard only from its own workspace's data", async () => {
    await repo.createLead(BOB, {
      name: "Bob's lead", email: null, phone: null, company: null,
      source: "website", status: "new", estimatedValueInr: null, notes: null,
    });
    await repo.createDeal(BOB, { title: "Bob won", valueInr: 99_000, stage: "won" }, NOW);
    await repo.createTask(BOB, { title: "Bob follow-up", type: "call", dueAt: NOW });

    const alice = await repo.getDashboardSummary(ALICE, [], NOW);
    expect(alice.totalLeads).toBe(0);
    expect(alice.activeDeals).toBe(0);
    expect(alice.wonThisMonth).toBe(0);
    expect(alice.revenueThisMonthInr).toBe(0);
    expect(alice.recentLeads).toEqual([]);
    expect(alice.upcomingFollowUps).toEqual([]);
    expect(alice.pipeline.every((s) => s.count === 0)).toBe(true);
  });
});

describe("dashboard summary", () => {
  it("counts real rows: leads, open deals, this month's wins and revenue", async () => {
    const lastMonth = new Date("2026-08-20T10:00:00Z");
    const lead = await repo.createLead(ALICE, {
      name: "Rohit Sharma", email: null, phone: "+919800000000", company: null,
      source: "whatsapp", status: "new", estimatedValueInr: 40000, notes: null,
    });
    await repo.createLead(ALICE, {
      name: "Priya Verma", email: null, phone: null, company: "Verma & Co",
      source: "website", status: "contacted", estimatedValueInr: null, notes: null,
    });
    await repo.createDeal(ALICE, { title: "Open A", valueInr: 10_000, stage: "proposal" }, NOW);
    await repo.createDeal(ALICE, { title: "Open B", valueInr: 20_000, stage: "negotiation" }, NOW);
    await repo.createDeal(ALICE, { title: "Won now", valueInr: 50_000, stage: "won" }, NOW);
    await repo.createDeal(ALICE, { title: "Won before", valueInr: 25_000, stage: "won" }, lastMonth);
    await repo.createDeal(ALICE, { title: "Lost", valueInr: 70_000, stage: "lost" }, NOW);
    await repo.createTask(ALICE, { title: "Call Rohit", type: "call", dueAt: new Date("2026-09-26T05:00:00Z"), leadId: lead.id });
    await repo.createTask(ALICE, { title: "Overdue meeting", type: "meeting", dueAt: new Date("2026-09-20T05:00:00Z") });
    await repo.createTask(ALICE, { title: "Internal to-do", type: "task", dueAt: NOW });

    const s = await repo.getDashboardSummary(ALICE, [], NOW);
    expect(s.totalLeads).toBe(2);
    expect(s.activeDeals).toBe(2);
    expect(s.activeDealsValueInr).toBe(30_000);
    expect(s.wonThisMonth).toBe(1);
    expect(s.revenueThisMonthInr).toBe(50_000);
    expect(s.revenueChangePct).toBe(100); // 50k vs 25k last month
    expect(s.pipeline.find((p) => p.stage === "won")?.count).toBe(2);
    expect(s.pipeline.some((p) => (p.stage as string) === "lost")).toBe(false);

    // Follow-ups: open call/meeting only (not internal tasks), soonest first.
    expect(s.upcomingFollowUps.map((f) => f.title)).toEqual(["Overdue meeting", "Call Rohit"]);
    expect(s.upcomingFollowUps[0].overdue).toBe(true);
    expect(s.upcomingFollowUps[1]).toMatchObject({ overdue: false, leadName: "Rohit Sharma" });

    const rohit = s.recentLeads.find((l) => l.name === "Rohit Sharma");
    expect(rohit).toMatchObject({ source: "whatsapp", nextAction: "Call Rohit" });
  });
});

describe("lifecycle", () => {
  it("converts a lead into an open deal carrying its value", async () => {
    const lead = await repo.createLead(ALICE, {
      name: "Amit Singh", email: null, phone: null, company: "Singh Traders",
      source: "facebook_ads", status: "qualified", estimatedValueInr: 75000, notes: null,
    });
    const deal = await repo.convertLeadToDeal(ALICE, lead.id);
    expect(deal).toMatchObject({ leadId: lead.id, valueInr: 75000, stage: "new", title: "Singh Traders — Amit Singh" });
    expect((await repo.getLead(ALICE, lead.id))?.status).toBe("converted");
  });

  it("stamps and clears closedAt as a deal moves through stages", async () => {
    const deal = await repo.createDeal(ALICE, { title: "Deal", valueInr: 1000, stage: "proposal" }, NOW);
    expect(deal.closedAt).toBeNull();
    const won = await repo.updateDeal(ALICE, deal.id, { stage: "won" }, NOW);
    expect(won?.closedAt?.toISOString()).toBe(NOW.toISOString());
    const reopened = await repo.updateDeal(ALICE, deal.id, { stage: "negotiation" }, NOW);
    expect(reopened?.closedAt).toBeNull();
  });

  it("completes and reopens tasks, and unlinks them when their deal is deleted", async () => {
    const deal = await repo.createDeal(ALICE, { title: "Deal", valueInr: 0, stage: "new" });
    const task = await repo.createTask(ALICE, { title: "Send proposal", type: "email", dueAt: NOW, dealId: deal.id });
    expect((await repo.updateTask(ALICE, task.id, { completed: true }, NOW))?.completedAt).not.toBeNull();
    expect(await repo.listTasks(ALICE, { status: "open" })).toEqual([]);
    expect((await repo.updateTask(ALICE, task.id, { completed: false }, NOW))?.completedAt).toBeNull();

    await repo.deleteDeal(ALICE, deal.id);
    const [kept] = await repo.listTasks(ALICE);
    expect(kept.dealId).toBeNull();
  });

  it("searches leads by name, company, email or phone, treating % literally", async () => {
    const base = { email: null, phone: null, company: null, source: "manual" as const, status: "new" as const, estimatedValueInr: null, notes: null };
    await repo.createLead(ALICE, { ...base, name: "Neha Kapoor", company: "Kapoor Realty" });
    await repo.createLead(ALICE, { ...base, name: "Someone Else" });
    expect((await repo.listLeads(ALICE, { search: "realty" })).map((l) => l.name)).toEqual(["Neha Kapoor"]);
    expect(await repo.listLeads(ALICE, { search: "%" })).toEqual([]);
  });
});
