import { and, asc, eq, lte, ne } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { notifications, type Notification } from "@shared/schema";

/**
 * Sends WhatsApp notifications (campaigns) whose scheduled time has passed.
 *
 * Exactly-once: a due notification is *claimed* with a single conditional
 * UPDATE (scheduled -> sending). Only one caller can win that update, so a
 * second tick, a second server instance, or a user pressing "Send now" at
 * the same moment can never send it twice. Manual sends use the same rule
 * via claimNotificationForManualSend (anything but "sending" -> sending).
 *
 * Timezones: scheduled_at holds a UTC instant. The editor converts the
 * user's local date/time to UTC before saving, so "10:00" in India is stored
 * as 04:30Z and runs at 10:00 IST regardless of the server's timezone.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SchedulerDb = PgDatabase<PgQueryResultHKT, any, any>;

/** Result of starting a send, shared by the HTTP route and the scheduler. */
export type SendOutcome =
  | {
      ok: true;
      body: Record<string, unknown>;
      /** In-process sends (no Redis) continue after the response/claim. */
      run?: () => Promise<void>;
    }
  | { ok: false; status: number; error: string; message?: string };

const MAX_REASON_LENGTH = 500;

function reasonOf(outcome: { error: string; message?: string }): string {
  return (outcome.message || outcome.error).slice(0, MAX_REASON_LENGTH);
}

/** Atomically moves a due notification from "scheduled" to "sending". */
export async function claimScheduledNotification(
  db: SchedulerDb,
  id: string,
  now: Date,
): Promise<Notification | undefined> {
  const [row] = await db
    .update(notifications)
    .set({ status: "sending", sentAt: now, failureReason: null })
    .where(and(eq(notifications.id, id), eq(notifications.status, "scheduled"), lte(notifications.scheduledAt, now)))
    .returning();
  return row;
}

/** Manual "Send now": claim unless a send is already running. */
export async function claimNotificationForManualSend(
  db: SchedulerDb,
  id: string,
  now: Date,
): Promise<boolean> {
  const [row] = await db
    .update(notifications)
    .set({ status: "sending", sentAt: now, failureReason: null })
    .where(and(eq(notifications.id, id), ne(notifications.status, "sending")))
    .returning({ id: notifications.id });
  return !!row;
}

export async function markNotificationFailed(db: SchedulerDb, id: string, reason: string): Promise<void> {
  await db
    .update(notifications)
    .set({ status: "failed", failureReason: reason.slice(0, MAX_REASON_LENGTH) })
    .where(eq(notifications.id, id));
}

type SchedulerDeps = {
  db: SchedulerDb;
  /** Starts the send for an already-claimed notification. */
  execute: (notification: Notification) => Promise<SendOutcome>;
  now?: () => Date;
  batchSize?: number;
  log?: Pick<Console, "log" | "error">;
};

export function createNotificationScheduler({
  db,
  execute,
  now = () => new Date(),
  batchSize = 10,
  log = console,
}: SchedulerDeps) {
  let running = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const background = new Set<Promise<void>>();

  async function sendClaimed(claimed: Notification): Promise<void> {
    let outcome: SendOutcome;
    try {
      outcome = await execute(claimed);
    } catch (error) {
      await markNotificationFailed(db, claimed.id, `Send failed: ${(error as Error)?.message || "unknown error"}`);
      log.error(`[scheduler] notification ${claimed.id} threw before sending:`, error);
      return;
    }
    if (!outcome.ok) {
      await markNotificationFailed(db, claimed.id, reasonOf(outcome));
      log.log(`[scheduler] notification ${claimed.id} not sent: ${reasonOf(outcome)}`);
      return;
    }
    log.log(`[scheduler] notification ${claimed.id} started`);
    if (outcome.run) {
      // In-process send: don't block the next tick, but never lose a failure.
      const task = outcome
        .run()
        .catch(async (error) => {
          await markNotificationFailed(db, claimed.id, `Send failed: ${(error as Error)?.message || "unknown error"}`);
          log.error(`[scheduler] notification ${claimed.id} failed while sending:`, error);
        })
        .finally(() => background.delete(task));
      background.add(task);
    }
  }

  /** One pass: claim and start every notification that is due now. */
  async function runOnce(): Promise<number> {
    if (running) return 0; // never overlap ticks
    running = true;
    let started = 0;
    try {
      const at = now();
      const due = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.status, "scheduled"), lte(notifications.scheduledAt, at)))
        .orderBy(asc(notifications.scheduledAt))
        .limit(batchSize);
      for (const { id } of due) {
        const claimed = await claimScheduledNotification(db, id, at);
        if (!claimed) continue; // someone else (manual send / other instance) got it
        started++;
        await sendClaimed(claimed);
      }
    } catch (error) {
      log.error("[scheduler] tick failed:", error);
    } finally {
      running = false;
    }
    return started;
  }

  return {
    runOnce,
    start(intervalMs: number) {
      if (timer) return;
      timer = setInterval(() => void runOnce(), intervalMs);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    /** Resolves when in-process sends started by this scheduler finish (tests). */
    async idle() {
      await Promise.all(Array.from(background));
    },
  };
}
