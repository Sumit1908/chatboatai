import { getRedisConnection } from "./connection";
import { remainingKey } from "./constants";
import type { SendBatchJobData } from "./types";
import { storage } from "../storage";
import { broadcast } from "../realtime";

/**
 * When a job exhausts retries, still decrement the remaining counter so the
 * campaign/notification can finalize instead of staying stuck in "sending".
 */
export async function maybeFinalizeOnTerminalFailure(data: SendBatchJobData): Promise<void> {
  const redis = getRedisConnection();
  const left = await redis.decr(remainingKey(data.campaignId));

  // Persist failures for any phones that never got a message row.
  for (const phone of data.phones || []) {
    const existing = await storage.getMessageByCampaignAndPhone(data.campaignId, phone);
    if (existing) continue;
    await storage.createMessage({
      accountId: data.accountId,
      campaignId: data.campaignId,
      templateId: data.templateId,
      recipientPhone: phone,
      status: "failed",
      errorCode: "JOB_EXHAUSTED",
      errorDescription: "Send job failed after all retry attempts",
    });
  }

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
    broadcast("notification-updated", {
      notification: {
        id: data.campaignId,
        status: finalStatus,
        sentCount: counts.sent,
        failedCount: counts.failed,
      },
    });
  } else {
    await storage.updateCampaign(data.campaignId, {
      status: "completed",
      completedAt: new Date(),
    });
    broadcast("campaign-updated", {
      campaign: { id: data.campaignId, status: "completed", sentCount: counts.sent, failedCount: counts.failed },
    });
  }
}
