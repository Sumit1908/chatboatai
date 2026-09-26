import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api";
import * as schema from "@shared/schema";
import { notifications, type Notification } from "@shared/schema";
import {
  claimNotificationForManualSend,
  createNotificationScheduler,
  type SchedulerDb,
  type SendOutcome,
} from "./notificationScheduler";

let db: SchedulerDb;

// The real application schema, pushed into an in-memory Postgres.
beforeAll(async () => {
  const pg = drizzle(new PGlite());
  const { apply } = await pushSchema(schema as Record<string, unknown>, pg as any);
  await apply();
  db = pg as unknown as SchedulerDb;
}, 120_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE notifications`);
});

async function addNotification(values: Partial<Notification> & { status: string }): Promise<Notification> {
  const [row] = await db
    .insert(notifications)
    .values({ accountId: "acct-1", name: "Diwali offer", templateId: "tmpl-1", ...values })
    .returning();
  return row;
}

async function statusOf(id: string) {
  const [row] = await db.select().from(notifications).where(eq(notifications.id, id));
  return row;
}

const ok: SendOutcome = { ok: true, body: { message: "started" } };
const quietLog = { log: () => {}, error: () => {} };

describe("scheduled notification execution", () => {
  it("sends a due notification exactly once and records when it started", async () => {
    const due = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    const execute = vi.fn(async () => ok);
    const now = new Date("2026-09-26T04:31:00Z");
    const scheduler = createNotificationScheduler({ db, execute, now: () => now, log: quietLog });

    expect(await scheduler.runOnce()).toBe(1);
    expect(await scheduler.runOnce()).toBe(0); // later ticks don't resend
    expect(execute).toHaveBeenCalledTimes(1);
    const row = await statusOf(due.id);
    expect(row.status).toBe("sending");
    expect(row.sentAt?.toISOString()).toBe(now.toISOString());
  });

  it("waits until the scheduled time", async () => {
    const n = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    let now = new Date("2026-09-26T04:29:59Z");
    const execute = vi.fn(async () => ok);
    const scheduler = createNotificationScheduler({ db, execute, now: () => now, log: quietLog });

    expect(await scheduler.runOnce()).toBe(0);
    expect((await statusOf(n.id)).status).toBe("scheduled");
    now = new Date("2026-09-26T04:30:00Z");
    expect(await scheduler.runOnce()).toBe(1);
  });

  it("respects the user's timezone: 10:00 in India runs at 04:30 UTC", async () => {
    // What the editor sends for 10:00 chosen by an IST user.
    const n = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T10:00:00+05:30") });
    expect((await statusOf(n.id)).scheduledAt?.toISOString()).toBe("2026-09-26T04:30:00.000Z");
    const execute = vi.fn(async () => ok);
    let now = new Date("2026-09-26T04:29:00Z");
    const scheduler = createNotificationScheduler({ db, execute, now: () => now, log: quietLog });
    await scheduler.runOnce();
    expect(execute).not.toHaveBeenCalled();
    now = new Date("2026-09-26T04:30:00Z");
    await scheduler.runOnce();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("never sends twice when two schedulers (e.g. two server instances) race", async () => {
    await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    const execute = vi.fn(async () => ok);
    const now = () => new Date("2026-09-26T05:00:00Z");
    const a = createNotificationScheduler({ db, execute, now, log: quietLog });
    const b = createNotificationScheduler({ db, execute, now, log: quietLog });
    await Promise.all([a.runOnce(), b.runOnce(), a.runOnce(), b.runOnce()]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("a manual 'Send now' and the scheduler can't both send it", async () => {
    const n = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    const now = new Date("2026-09-26T05:00:00Z");
    expect(await claimNotificationForManualSend(db, n.id, now)).toBe(true);
    const execute = vi.fn(async () => ok);
    await createNotificationScheduler({ db, execute, now: () => now, log: quietLog }).runOnce();
    expect(execute).not.toHaveBeenCalled();

    // ...and the reverse: once the scheduler claimed it, a manual send is refused.
    const m = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    await createNotificationScheduler({ db, execute, now: () => now, log: quietLog }).runOnce();
    expect(await claimNotificationForManualSend(db, m.id, now)).toBe(false);
  });

  it("marks the notification failed with the reason when sending is refused", async () => {
    const n = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    const execute = vi.fn(async (): Promise<SendOutcome> => ({
      ok: false,
      status: 400,
      error: "Template must be approved by WhatsApp before sending messages",
    }));
    await createNotificationScheduler({ db, execute, now: () => new Date("2026-09-26T05:00:00Z"), log: quietLog }).runOnce();
    const row = await statusOf(n.id);
    expect(row.status).toBe("failed");
    expect(row.failureReason).toBe("Template must be approved by WhatsApp before sending messages");
  });

  it("prefers the human-readable message (e.g. plan expired) as the reason", async () => {
    const n = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    const execute = async (): Promise<SendOutcome> => ({
      ok: false, status: 402, error: "subscription_required", message: "Not sent: the plan or trial had ended at the scheduled time.",
    });
    await createNotificationScheduler({ db, execute, now: () => new Date("2026-09-26T05:00:00Z"), log: quietLog }).runOnce();
    expect((await statusOf(n.id)).failureReason).toBe("Not sent: the plan or trial had ended at the scheduled time.");
  });

  it("marks it failed if starting the send throws", async () => {
    const n = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    const execute = async (): Promise<SendOutcome> => {
      throw new Error("Meta API unreachable");
    };
    await createNotificationScheduler({ db, execute, now: () => new Date("2026-09-26T05:00:00Z"), log: quietLog }).runOnce();
    const row = await statusOf(n.id);
    expect(row.status).toBe("failed");
    expect(row.failureReason).toBe("Send failed: Meta API unreachable");
  });

  it("marks it failed if the background (in-process) send fails", async () => {
    const n = await addNotification({ status: "scheduled", scheduledAt: new Date("2026-09-26T04:30:00Z") });
    const execute = async (): Promise<SendOutcome> => ({
      ok: true,
      body: {},
      run: async () => {
        throw new Error("connection reset");
      },
    });
    const scheduler = createNotificationScheduler({ db, execute, now: () => new Date("2026-09-26T05:00:00Z"), log: quietLog });
    await scheduler.runOnce();
    await scheduler.idle();
    expect((await statusOf(n.id)).failureReason).toBe("Send failed: connection reset");
  });

  it("ignores drafts, completed, failed and unscheduled notifications", async () => {
    const past = new Date("2026-09-01T00:00:00Z");
    await addNotification({ status: "draft", scheduledAt: past });
    await addNotification({ status: "completed", scheduledAt: past });
    await addNotification({ status: "failed", scheduledAt: past });
    await addNotification({ status: "scheduled", scheduledAt: null });
    const execute = vi.fn(async () => ok);
    await createNotificationScheduler({ db, execute, now: () => new Date("2026-09-26T05:00:00Z"), log: quietLog }).runOnce();
    expect(execute).not.toHaveBeenCalled();
  });
});
