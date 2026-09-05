import { Queue } from "bullmq";
import { getBullMqConnectionOptions, getRedisConnection } from "./connection";
import {
  ACTIVE_ACCOUNTS_KEY,
  accountQueueName,
  PHONES_PER_JOB,
  remainingKey,
  statsKey,
} from "./constants";
import type { EnqueueBroadcastInput, EnqueueBroadcastResult, SendBatchJobData } from "./types";

const queues = new Map<string, Queue<SendBatchJobData>>();

export function getAccountQueue(accountId: string): Queue<SendBatchJobData> {
  let queue = queues.get(accountId);
  if (!queue) {
    queue = new Queue<SendBatchJobData>(accountQueueName(accountId), {
      connection: getBullMqConnectionOptions(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
    queues.set(accountId, queue);
  }
  return queue;
}

function chunkPhones(phones: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < phones.length; i += size) {
    out.push(phones.slice(i, i + size));
  }
  return out;
}

/**
 * Stream recipient phones into small BullMQ jobs on the account's queue.
 * Never holds the full recipient list in one array.
 */
export async function enqueueBroadcast(input: EnqueueBroadcastInput): Promise<EnqueueBroadcastResult> {
  const queue = getAccountQueue(input.accountId);
  const redis = getRedisConnection();
  const pendingJobs: { name: string; data: SendBatchJobData }[] = [];

  // Reset remaining counter for this campaign so resume/re-send doesn't
  // inherit a stale value from a previous interrupted run.
  await redis.del(remainingKey(input.campaignId));

  let totalRecipients = 0;
  let jobCount = 0;
  const seen = new Set<string>();

  for await (const chunk of input.phoneChunks) {
    const unique: string[] = [];
    for (const raw of chunk) {
      const phone = raw?.trim();
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      unique.push(phone);
    }
    if (unique.length === 0) continue;

    totalRecipients += unique.length;

    for (const phones of chunkPhones(unique, PHONES_PER_JOB)) {
      pendingJobs.push({
        name: "send-batch",
        data: {
          kind: input.kind,
          accountId: input.accountId,
          campaignId: input.campaignId,
          templateId: input.templateId,
          templateName: input.templateName,
          templateLanguage: input.templateLanguage,
          phones,
          headerParams: input.headerParams,
          bodyParams: input.bodyParams,
          bodyPreview: input.bodyPreview,
          conversationMediaUrl: input.conversationMediaUrl,
          totalRecipients: input.totalRecipients ?? 0,
        },
      });
    }

    // Flush periodically so we don't build a giant jobs array either.
    if (pendingJobs.length >= 50) {
      jobCount += await flushJobs(queue, redis, input, pendingJobs, totalRecipients);
    }
  }

  if (pendingJobs.length > 0) {
    jobCount += await flushJobs(queue, redis, input, pendingJobs, totalRecipients);
  }

  const finalTotal = input.totalRecipients ?? totalRecipients;

  await redis.hset(statsKey(input.accountId), {
    lastCampaignId: input.campaignId,
    lastEnqueuedAt: String(Date.now()),
    lastTotalRecipients: String(finalTotal),
  });

  return {
    jobCount,
    totalRecipients: finalTotal,
    queueName: accountQueueName(input.accountId),
  };
}

async function flushJobs(
  queue: Queue<SendBatchJobData>,
  redis: ReturnType<typeof getRedisConnection>,
  input: EnqueueBroadcastInput,
  pendingJobs: { name: string; data: SendBatchJobData }[],
  runningTotal: number,
): Promise<number> {
  const batch = pendingJobs.splice(0, pendingJobs.length);
  if (batch.length === 0) return 0;

  for (const job of batch) {
    job.data.totalRecipients = input.totalRecipients ?? runningTotal;
  }

  await redis.incrby(remainingKey(input.campaignId), batch.length);
  await redis.sadd(ACTIVE_ACCOUNTS_KEY, input.accountId);
  await queue.addBulk(batch);
  return batch.length;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
}
