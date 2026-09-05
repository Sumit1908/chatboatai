import { Worker, type Job } from "bullmq";
import { storage } from "../storage";
import { getBullMqConnectionOptions, getRedisConnection, isQueueEnabled } from "./connection";
import {
  ACTIVE_ACCOUNTS_KEY,
  accountQueueName,
  BACKLOG_ALERT_KEY_PREFIX,
  MAX_CONCURRENT_ACCOUNT_WORKERS,
} from "./constants";
import { getAccountQueue } from "./enqueue";
import { processSendBatchJob } from "./processor";
import { bullMqLimiterForAccount } from "./rate-limit";
import type { SendBatchJobData } from "./types";

interface AccountWorkerEntry {
  worker: Worker<SendBatchJobData>;
  accountId: string;
}

/**
 * Fair dispatcher: at most MAX_CONCURRENT_ACCOUNT_WORKERS live Workers.
 * Every reconcile tick we round-robin which active account queues get a
 * Worker slot, so one giant campaign cannot monopolize the pool while
 * others starve.
 */
class FairBroadcastDispatcher {
  private workers = new Map<string, AccountWorkerEntry>();
  private rrCursor = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  start() {
    if (this.running) return;
    if (!isQueueEnabled()) {
      console.warn("[broadcast-queue] Redis not configured — queue workers disabled.");
      return;
    }
    this.running = true;
    void this.reconcile();
    this.timer = setInterval(() => {
      void this.reconcile();
    }, 2000);
  }

  async stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await Promise.all(Array.from(this.workers.values()).map((e) => e.worker.close()));
    this.workers.clear();
  }

  private async reconcile() {
    if (!this.running) return;

    try {
      const redis = getRedisConnection();
      const accountIds = await redis.smembers(ACTIVE_ACCOUNTS_KEY);
      const withWork: string[] = [];

      for (const accountId of accountIds) {
        const queue = getAccountQueue(accountId);
        const counts = await queue.getJobCounts("waiting", "active", "delayed", "paused");
        const depth = counts.waiting + counts.active + counts.delayed + counts.paused;

        if (depth === 0) {
          await redis.srem(ACTIVE_ACCOUNTS_KEY, accountId);
          await this.stopWorker(accountId);
          continue;
        }

        withWork.push(accountId);
        await this.checkBacklog(accountId, depth, counts.active);
      }

      if (withWork.length === 0) return;

      // Round-robin window of accounts that receive a live Worker this tick.
      const selected = this.selectRoundRobin(withWork, MAX_CONCURRENT_ACCOUNT_WORKERS);

      for (const accountId of Array.from(this.workers.keys())) {
        if (!selected.includes(accountId)) {
          await this.stopWorker(accountId);
        }
      }

      for (const accountId of selected) {
        if (!this.workers.has(accountId)) {
          await this.startWorker(accountId);
        }
      }
    } catch (err: any) {
      console.error("[broadcast-queue] reconcile error:", err.message);
    }
  }

  private selectRoundRobin(accountIds: string[], max: number): string[] {
    if (accountIds.length <= max) return accountIds;

    const selected: string[] = [];
    const n = accountIds.length;
    for (let i = 0; i < max; i++) {
      const idx = (this.rrCursor + i) % n;
      selected.push(accountIds[idx]);
    }
    this.rrCursor = (this.rrCursor + max) % n;
    return selected;
  }

  private async startWorker(accountId: string) {
    const account = await storage.getAccount(accountId);
    const limiter = bullMqLimiterForAccount({
      messagingLimit: account?.messagingLimit,
      throughputLevel: account?.throughputLevel,
      qualityRating: account?.qualityRating,
    });

    const worker = new Worker<SendBatchJobData>(
      accountQueueName(accountId),
      async (job: Job<SendBatchJobData>) => processSendBatchJob(job),
      {
        connection: getBullMqConnectionOptions(),
        // Small per-account concurrency: fairness comes from rotating which
        // accounts have Workers, not from draining one queue with high parallelism.
        concurrency: 2,
        limiter,
      },
    );

    worker.on("failed", async (job, err) => {
      console.error(
        `[broadcast-queue] job ${job?.id} failed on ${accountId}:`,
        err.message,
      );
      if (!job) return;

      // Only finalize/decrement when BullMQ has exhausted retries — otherwise
      // a rate-limit throw would under-count remaining jobs mid-retry.
      const maxAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade < maxAttempts) return;

      try {
        const { maybeFinalizeOnTerminalFailure } = await import("./finalize");
        await maybeFinalizeOnTerminalFailure(job.data);
      } catch (finalizeErr: any) {
        console.error("[broadcast-queue] terminal failure finalize error:", finalizeErr.message);
      }
    });

    worker.on("error", (err) => {
      console.error(`[broadcast-queue] worker error (${accountId}):`, err.message);
    });

    this.workers.set(accountId, { worker, accountId });
  }

  private async stopWorker(accountId: string) {
    const entry = this.workers.get(accountId);
    if (!entry) return;
    this.workers.delete(accountId);
    await entry.worker.close();
  }

  private async checkBacklog(accountId: string, depth: number, active: number) {
    // Alert (log) when waiting grows while nothing is being drained.
    if (depth < 50) return;
    const redis = getRedisConnection();
    const key = `${BACKLOG_ALERT_KEY_PREFIX}${accountId}`;
    const last = await redis.get(key);
    const now = Date.now();
    if (last && now - Number(last) < 60_000) return;

    const drainRate = active > 0 ? "draining" : "stalled";
    console.warn(
      `[broadcast-queue] BACKLOG account=${accountId} depth=${depth} active=${active} state=${drainRate}`,
    );
    await redis.set(key, String(now), "EX", 120);
  }
}

const dispatcher = new FairBroadcastDispatcher();

export function startBroadcastWorkers() {
  dispatcher.start();
}

export async function stopBroadcastWorkers() {
  await dispatcher.stop();
}
