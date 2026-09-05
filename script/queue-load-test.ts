/**
 * Fairness / memory smoke test for the broadcast queue.
 *
 * Simulates N fake accounts each enqueueing thousands of jobs, then watches
 * that every account's queue drains in parallel (not one-after-another) and
 * that process memory stays roughly flat.
 *
 * Usage:
 *   npx tsx script/queue-load-test.ts
 *
 * Requires UPSTASH_REDIS_* or REDIS_URL in .env. Does NOT call WhatsApp —
 * it enqueues jobs then drains them with a no-op-ish processor check via
 * queue depth sampling only (jobs will sit until real workers process them,
 * OR pass --drain-mock to consume with a local mock worker).
 */
import "dotenv/config";
import { Queue, Worker } from "bullmq";
import {
  getBullMqConnectionOptions,
  isQueueEnabled,
  getRedisUrl,
} from "../server/queues/connection";
import {
  ACTIVE_ACCOUNTS_KEY,
  accountQueueName,
  PHONES_PER_JOB,
} from "../server/queues/constants";
import { getRedisConnection } from "../server/queues/connection";

const USERS = Number(process.env.LOAD_TEST_USERS || 8);
const MSGS_PER_USER = Number(process.env.LOAD_TEST_MSGS || 2000);
const DRAIN_MOCK = process.argv.includes("--drain-mock");

async function main() {
  if (!isQueueEnabled()) {
    console.error("Redis not configured. Set UPSTASH_REDIS_* or REDIS_URL.");
    process.exit(1);
  }

  console.log(`Redis: ${getRedisUrl()?.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Simulating ${USERS} users × ${MSGS_PER_USER} messages (${PHONES_PER_JOB}/job)`);

  const connection = getBullMqConnectionOptions();
  const redis = getRedisConnection();
  const accountIds = Array.from({ length: USERS }, (_, i) => `loadtest-user-${i + 1}`);

  const memSamples: number[] = [];
  const sampleMem = () => {
    const mb = process.memoryUsage().heapUsed / 1024 / 1024;
    memSamples.push(mb);
    return mb;
  };

  console.log(`Heap before enqueue: ${sampleMem().toFixed(1)} MB`);

  for (const accountId of accountIds) {
    const queue = new Queue(accountQueueName(accountId), { connection });
    const jobs = [];
    const jobCount = Math.ceil(MSGS_PER_USER / PHONES_PER_JOB);
    for (let j = 0; j < jobCount; j++) {
      const phones = Array.from({ length: PHONES_PER_JOB }, (_, k) =>
        `1555${String(iPad(accountId, j, k)).slice(-7)}`,
      );
      jobs.push({
        name: "send-batch",
        data: {
          kind: "notification",
          accountId,
          campaignId: `loadtest-campaign-${accountId}`,
          templateId: "loadtest",
          templateName: "hello",
          templateLanguage: "en",
          phones,
          bodyPreview: "load test",
          totalRecipients: MSGS_PER_USER,
        },
        opts: { removeOnComplete: true, removeOnFail: true },
      });
      if (jobs.length >= 100) {
        await queue.addBulk(jobs.splice(0, jobs.length));
      }
    }
    if (jobs.length) await queue.addBulk(jobs);
    await redis.sadd(ACTIVE_ACCOUNTS_KEY, accountId);
    await queue.close();
    console.log(`  enqueued ${accountId}`);
  }

  console.log(`Heap after enqueue: ${sampleMem().toFixed(1)} MB`);

  const workers: Worker[] = [];
  if (DRAIN_MOCK) {
    for (const accountId of accountIds) {
      const worker = new Worker(
        accountQueueName(accountId),
        async () => {
          // Simulate a cheap send without calling Meta
          await new Promise((r) => setTimeout(r, 5));
        },
        { connection, concurrency: 2 },
      );
      workers.push(worker);
    }
    console.log("Mock workers draining in parallel...");
  }

  const started = Date.now();
  const progressLog: Array<Record<string, number>> = [];

  while (Date.now() - started < 120_000) {
    const depths: Record<string, number> = {};
    let total = 0;
    for (const accountId of accountIds) {
      const queue = new Queue(accountQueueName(accountId), { connection });
      const counts = await queue.getJobCounts("waiting", "active", "delayed");
      const d = counts.waiting + counts.active + counts.delayed;
      depths[accountId] = d;
      total += d;
      await queue.close();
    }
    progressLog.push({ ...depths, _total: total, _heap: sampleMem() });
    console.log(
      `t=${((Date.now() - started) / 1000).toFixed(0)}s totalDepth=${total} heap=${sampleMem().toFixed(1)}MB`,
      depths,
    );
    if (total === 0) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Fairness check: did multiple queues make progress in the same windows?
  let parallelProgressWindows = 0;
  for (let i = 1; i < progressLog.length; i++) {
    let progressed = 0;
    for (const id of accountIds) {
      if ((progressLog[i - 1][id] || 0) > (progressLog[i][id] || 0)) progressed++;
    }
    if (progressed >= 2) parallelProgressWindows++;
  }

  const heapMin = Math.min(...memSamples);
  const heapMax = Math.max(...memSamples);
  console.log("\n=== Results ===");
  console.log(`Parallel progress windows: ${parallelProgressWindows}/${Math.max(0, progressLog.length - 1)}`);
  console.log(`Heap min/max: ${heapMin.toFixed(1)} / ${heapMax.toFixed(1)} MB (delta ${(heapMax - heapMin).toFixed(1)})`);
  if (DRAIN_MOCK && parallelProgressWindows === 0 && progressLog.length > 2) {
    console.error("FAIL: queues did not drain in parallel");
    process.exitCode = 1;
  } else if (heapMax - heapMin > 200) {
    console.warn("WARN: heap grew >200MB during test — investigate");
  } else {
    console.log("OK: fairness/memory smoke signals look healthy");
  }

  await Promise.all(workers.map((w) => w.close()));
  await redis.quit();
  process.exit(process.exitCode || 0);
}

function iPad(accountId: string, j: number, k: number): number {
  const userNum = Number(accountId.replace(/\D/g, "")) || 1;
  return userNum * 1_000_000 + j * 100 + k;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
