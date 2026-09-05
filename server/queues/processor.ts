import type { Job } from "bullmq";
import { storage } from "../storage";
import * as whatsappApi from "../whatsapp-api";
import { broadcast } from "../realtime";
import { getRedisConnection } from "./connection";
import { messagesPerSecondForAccount } from "./rate-limit";
import {
  GLOBAL_SEND_CONCURRENCY,
  META_RATE_LIMIT_CODES,
  SEND_CONCURRENCY_PER_JOB,
  TRANSIENT_RETRY_CODES,
  ENGAGEMENT_THROTTLE_CODE,
  ENGAGEMENT_THROTTLE_WINDOW_MS,
  ENGAGEMENT_THROTTLE_MIN_SAMPLE,
  ENGAGEMENT_THROTTLE_FAILURE_RATE,
  ENGAGEMENT_THROTTLE_COOLDOWN_MS,
  engagementWindowKey,
  engagementCooldownKey,
  remainingKey,
} from "./constants";
import type { SendBatchJobData } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Tracks a rolling window of send outcomes per account. When the share that
 * are Meta's engagement throttle (131049 - not a transient error, Meta
 * deliberately declined delivery) crosses the threshold, pause that
 * account's sends for a cooldown instead of continuing to blast into it.
 */
async function recordEngagementOutcome(accountId: string, wasThrottled: boolean): Promise<void> {
  const redis = getRedisConnection();
  const key = engagementWindowKey(accountId);
  const multi = redis.multi();
  multi.hincrby(key, "total", 1);
  multi.hincrby(key, "throttled", wasThrottled ? 1 : 0);
  multi.pexpire(key, ENGAGEMENT_THROTTLE_WINDOW_MS);
  const results = await multi.exec();
  const total = Number(results?.[0]?.[1] ?? 0);
  const throttled = Number(results?.[1]?.[1] ?? 0);

  if (total >= ENGAGEMENT_THROTTLE_MIN_SAMPLE && throttled / total >= ENGAGEMENT_THROTTLE_FAILURE_RATE) {
    await redis.set(engagementCooldownKey(accountId), "1", "PX", ENGAGEMENT_THROTTLE_COOLDOWN_MS);
    console.warn(
      `[broadcast-queue] account ${accountId} engagement-throttle rate ${throttled}/${total} >= ` +
        `${ENGAGEMENT_THROTTLE_FAILURE_RATE * 100}% — pausing sends for ${ENGAGEMENT_THROTTLE_COOLDOWN_MS / 60000}min`,
    );
  }
}

/** Process-wide semaphore so concurrent account workers don't stampede Meta. */
let globalInFlight = 0;
const globalWaiters: Array<() => void> = [];

async function acquireGlobalSlot(): Promise<void> {
  if (globalInFlight < GLOBAL_SEND_CONCURRENCY) {
    globalInFlight++;
    return;
  }
  await new Promise<void>((resolve) => globalWaiters.push(resolve));
  globalInFlight++;
}

function releaseGlobalSlot() {
  globalInFlight = Math.max(0, globalInFlight - 1);
  const next = globalWaiters.shift();
  if (next) next();
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(pool);
  return results;
}

function isRateLimited(errorCode?: number | string | null): boolean {
  if (errorCode == null || errorCode === "") return false;
  return META_RATE_LIMIT_CODES.has(Number(errorCode));
}

interface SlimSendResult {
  status: "sent" | "failed";
  message_id?: string;
  error?: string;
  errorCode?: string;
  phone: string;
}

async function sendOne(
  data: SendBatchJobData,
  phone: string,
  creds: { phoneNumberId: string; accessToken: string },
): Promise<SlimSendResult> {
  await acquireGlobalSlot();
  try {
    const result = await whatsappApi.sendTemplateMessage(
      creds.phoneNumberId,
      creds.accessToken,
      phone,
      data.templateName,
      data.templateLanguage,
      data.headerParams as any,
      data.bodyParams as any,
    );

    if (result.success && result.data?.messages?.[0]?.id) {
      const messageId = result.data.messages[0].id as string;
      // Persist only the slim fields — never the full Meta response object.
      await storage.createMessage({
        accountId: data.accountId,
        campaignId: data.campaignId,
        templateId: data.templateId,
        recipientPhone: phone,
        whatsappMessageId: messageId,
        status: "sent",
        sentAt: new Date(),
      });

      try {
        let conv = await storage.getConversationByPhone(phone, data.accountId);
        if (!conv) {
          conv = await storage.createConversation(phone, undefined, data.accountId);
        }
        await storage.updateConversation(conv.id, {
          lastMessage: data.bodyPreview,
          lastMessageAt: new Date(),
          status: "open",
        });
        await storage.addConversationMessage({
          conversationId: conv.id,
          content: data.bodyPreview,
          direction: "outbound",
          type: "template",
          mediaUrl: data.conversationMediaUrl,
          templateName: data.templateName,
          status: "sent",
        });
        broadcast("conversation-updated", { conversationId: conv.id });
      } catch (convErr: any) {
        console.error(`[broadcast] conversation update failed for ${phone}:`, convErr.message);
      }

      await recordEngagementOutcome(data.accountId, false);
      return { status: "sent", message_id: messageId, phone };
    }

    const code = result.error?.code;
    const numericCode = Number(code);
    if (isRateLimited(code)) {
      // Signal BullMQ to retry the whole job with exponential backoff.
      const err = new Error(result.error?.message || "Meta rate limit") as Error & {
        code?: number;
      };
      err.code = numericCode;
      throw err;
    }

    if (TRANSIENT_RETRY_CODES.has(numericCode)) {
      // Genuinely transient (e.g. "Message undeliverable") - worth retrying
      // via BullMQ's job-level attempts/backoff, unlike the engagement
      // throttle below which retrying would not fix.
      const err = new Error(result.error?.message || "Transient delivery failure") as Error & {
        code?: number;
      };
      err.code = numericCode;
      throw err;
    }

    await recordEngagementOutcome(data.accountId, numericCode === ENGAGEMENT_THROTTLE_CODE);

    await storage.createMessage({
      accountId: data.accountId,
      campaignId: data.campaignId,
      templateId: data.templateId,
      recipientPhone: phone,
      status: "failed",
      errorCode: String(code ?? ""),
      errorDescription: result.error?.message || "Unknown error",
    });

    return {
      status: "failed",
      phone,
      error: result.error?.message || "Unknown error",
      errorCode: String(code ?? ""),
    };
  } catch (err: any) {
    if (
      isRateLimited(err?.code) ||
      TRANSIENT_RETRY_CODES.has(Number(err?.code)) ||
      /rate limit|too many requests|131056|130429/i.test(err?.message || "")
    ) {
      throw err;
    }

    await recordEngagementOutcome(data.accountId, false);

    await storage.createMessage({
      accountId: data.accountId,
      campaignId: data.campaignId,
      templateId: data.templateId,
      recipientPhone: phone,
      status: "failed",
      errorCode: "EXCEPTION",
      errorDescription: err.message || "Unexpected error while sending",
    });

    return {
      status: "failed",
      phone,
      error: err.message || "Unexpected error",
      errorCode: "EXCEPTION",
    };
  } finally {
    releaseGlobalSlot();
  }
}

async function maybeFinalizeCampaign(data: SendBatchJobData): Promise<void> {
  const redis = getRedisConnection();
  const left = await redis.decr(remainingKey(data.campaignId));
  if (left > 0) return;

  await redis.del(remainingKey(data.campaignId));

  const counts = await storage.getMessageStatusCountsByCampaign(data.campaignId);
  const finalStatus = counts.sent === 0 && counts.failed > 0 ? "failed" : "completed";

  if (data.kind === "notification") {
    await storage.updateNotification(data.campaignId, {
      status: finalStatus,
      completedAt: new Date(),
      sentCount: counts.sent,
      failedCount: counts.failed,
      deliveredCount: counts.sent,
    });

    const activity = await storage.addActivity({
      accountId: data.accountId,
      type: "notification_completed",
      title: finalStatus === "failed" ? "Notification Failed" : "Notification Completed",
      description: `${data.templateName}: ${counts.sent} sent, ${counts.failed} failed out of ${counts.total}`,
      timestamp: new Date(),
      metadata: null,
    });
    broadcast("notification-updated", {
      notification: {
        id: data.campaignId,
        status: finalStatus,
        sentCount: counts.sent,
        failedCount: counts.failed,
      },
    });
    broadcast("activity-added", { activity });
  } else {
    await storage.updateCampaign(data.campaignId, {
      status: "completed",
      completedAt: new Date(),
    });
    const activity = await storage.addActivity({
      accountId: data.accountId,
      type: "campaign_completed",
      title: "Campaign Completed",
      description: `${data.templateName}: ${counts.sent} sent, ${counts.failed} failed`,
      timestamp: new Date(),
      metadata: null,
    });
    broadcast("campaign-updated", {
      campaign: { id: data.campaignId, status: "completed", sentCount: counts.sent, failedCount: counts.failed },
    });
    broadcast("activity-added", { activity });
  }

}

export async function processSendBatchJob(job: Job<SendBatchJobData>): Promise<{
  sent: number;
  failed: number;
}> {
  const data = job.data;
  const rawPhones = data.phones || [];

  if (rawPhones.length === 0) {
    await maybeFinalizeCampaign(data);
    return { sent: 0, failed: 0 };
  }

  // Skip phones already attempted (important on job retry after partial success).
  const attempted = await storage.getExistingPhonesForCampaign(data.campaignId, rawPhones);
  const phones = rawPhones.filter((p) => !attempted.has(p));

  if (phones.length === 0) {
    await maybeFinalizeCampaign(data);
    return { sent: 0, failed: 0 };
  }

  // Soft daily-tier guard: if Meta's 24h conversation cap is known and already
  // exhausted on this number, mark the batch failed without calling Meta.
  const account = await storage.getAccount(data.accountId);
  if (!account?.accessToken || !account?.phoneNumberId) {
    throw new Error(`WhatsApp account ${data.accountId} is missing credentials`);
  }

  if (account.messagingLimit && account.messagingLimit > 0 && account.messagingLimit < 999999) {
    const used = await storage.getMessagingUsed24h(data.accountId);
    if (used >= account.messagingLimit) {
      for (const phone of phones) {
        await storage.createMessage({
          accountId: data.accountId,
          campaignId: data.campaignId,
          templateId: data.templateId,
          recipientPhone: phone,
          status: "failed",
          errorCode: "TIER_LIMIT",
          errorDescription: `Messaging tier limit reached (${account.messagingLimit}/24h)`,
        });
      }
      await maybeFinalizeCampaign(data);
      return { sent: 0, failed: phones.length };
    }
  }

  // If a recent burst of engagement-throttle failures tripped the circuit
  // breaker for this account, wait out the remainder of the cooldown before
  // sending anything else instead of continuing to blast into the throttle.
  const redis = getRedisConnection();
  const cooldownRemaining = await redis.pttl(engagementCooldownKey(data.accountId));
  if (cooldownRemaining > 0) {
    console.warn(
      `[broadcast-queue] account ${data.accountId} waiting out engagement-throttle cooldown (${cooldownRemaining}ms)`,
    );
    await sleep(cooldownRemaining);
  }

  const creds = { phoneNumberId: account.phoneNumberId, accessToken: account.accessToken };

  // A brand-new/low-quality number's safe rate can be well below what
  // PHONES_PER_JOB sent at SEND_CONCURRENCY_PER_JOB would imply (that
  // combination alone can fire ~10 sends in well under a second). Fall back
  // to sending this job's phones one at a time, paced to the account's
  // actual budget, whenever that budget is the tighter constraint.
  const mps = messagesPerSecondForAccount({
    messagingLimit: account.messagingLimit,
    throughputLevel: account.throughputLevel,
    qualityRating: account.qualityRating,
  });
  const concurrency = mps < SEND_CONCURRENCY_PER_JOB ? 1 : SEND_CONCURRENCY_PER_JOB;
  const interSendDelayMs = concurrency === 1 ? Math.ceil(1000 / mps) : 0;

  let isFirstSend = true;
  const results = await mapPool(phones, concurrency, async (phone) => {
    if (interSendDelayMs > 0) {
      if (!isFirstSend) await sleep(interSendDelayMs);
      isFirstSend = false;
    }
    return sendOne(data, phone, creds);
  });

  let sent = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "sent") sent++;
    else failed++;
  }

  // Progress tick — counts from DB so resumes stay accurate without holding arrays.
  const counts = await storage.getMessageStatusCountsByCampaign(data.campaignId);
  if (data.kind === "notification") {
    await storage.updateNotification(data.campaignId, {
      sentCount: counts.sent,
      failedCount: counts.failed,
    });
    broadcast("notification-updated", {
      notification: {
        id: data.campaignId,
        sentCount: counts.sent,
        failedCount: counts.failed,
        totalRecipients: data.totalRecipients,
      },
    });
  } else {
    broadcast("campaign-updated", {
      campaign: { id: data.campaignId, sentCount: counts.sent, failedCount: counts.failed },
    });
  }

  await redis.hincrby(`wa-send:stats:${data.accountId}`, "sent", sent);
  await redis.hincrby(`wa-send:stats:${data.accountId}`, "failed", failed);
  await redis.hset(`wa-send:stats:${data.accountId}`, "lastProcessedAt", String(Date.now()));

  await maybeFinalizeCampaign(data);

  // Drop references promptly (helps GC under load).
  (data as { phones?: string[] }).phones = [];
  return { sent, failed };
}
