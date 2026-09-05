import { getRedisConnection, isQueueEnabled } from "./connection";
import { ACTIVE_ACCOUNTS_KEY, accountQueueName, statsKey } from "./constants";
import { getAccountQueue } from "./enqueue";

export interface AccountQueueStats {
  accountId: string;
  queueName: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  depth: number;
  sent: number;
  failedSends: number;
  lastProcessedAt: number | null;
  backlogAlert: boolean;
}

export interface QueueMonitorSnapshot {
  enabled: boolean;
  activeAccounts: number;
  accounts: AccountQueueStats[];
  totals: {
    waiting: number;
    active: number;
    depth: number;
    failed: number;
  };
}

export async function getQueueMonitorSnapshot(): Promise<QueueMonitorSnapshot> {
  if (!isQueueEnabled()) {
    return {
      enabled: false,
      activeAccounts: 0,
      accounts: [],
      totals: { waiting: 0, active: 0, depth: 0, failed: 0 },
    };
  }

  const redis = getRedisConnection();
  const accountIds = await redis.smembers(ACTIVE_ACCOUNTS_KEY);
  const accounts: AccountQueueStats[] = [];

  let waiting = 0;
  let active = 0;
  let depth = 0;
  let failed = 0;

  for (const accountId of accountIds) {
    const queue = getAccountQueue(accountId);
    const counts = await queue.getJobCounts("waiting", "active", "delayed", "failed", "completed");
    const stats = await redis.hgetall(statsKey(accountId));
    const qDepth = counts.waiting + counts.active + counts.delayed;

    waiting += counts.waiting;
    active += counts.active;
    depth += qDepth;
    failed += counts.failed;

    accounts.push({
      accountId,
      queueName: accountQueueName(accountId),
      waiting: counts.waiting,
      active: counts.active,
      delayed: counts.delayed,
      failed: counts.failed,
      completed: counts.completed,
      depth: qDepth,
      sent: Number(stats.sent || 0),
      failedSends: Number(stats.failed || 0),
      lastProcessedAt: stats.lastProcessedAt ? Number(stats.lastProcessedAt) : null,
      backlogAlert: qDepth >= 50 && counts.active === 0,
    });
  }

  accounts.sort((a, b) => b.depth - a.depth);

  return {
    enabled: true,
    activeAccounts: accountIds.length,
    accounts,
    totals: { waiting, active, depth, failed },
  };
}
