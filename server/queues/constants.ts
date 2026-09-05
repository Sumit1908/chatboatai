/** One BullMQ queue per WhatsApp account (phone number). */
export function accountQueueName(accountId: string): string {
  // BullMQ forbids ":" in queue names.
  return `wa-send-account-${accountId}`;
}

export const ACTIVE_ACCOUNTS_KEY = "wa-send:active-accounts";
export const REMAINING_KEY_PREFIX = "wa-send:remaining:";
export const STATS_KEY_PREFIX = "wa-send:stats:";
export const BACKLOG_ALERT_KEY_PREFIX = "wa-send:backlog-alert:";

/** Phones per BullMQ job — keep jobs small so nothing huge sits in Redis/memory. */
export const PHONES_PER_JOB = 10;

/** How many jobs one account may run per fair-dispatcher cycle. */
export const JOBS_PER_ACCOUNT_CYCLE = 1;

/** Max account queues with live Workers at once (round-robin the rest). */
export const MAX_CONCURRENT_ACCOUNT_WORKERS = 20;

/** Concurrent Meta API calls inside a single batch job. */
export const SEND_CONCURRENCY_PER_JOB = 5;

/** Soft global ceiling for in-flight Meta sends across all workers. */
export const GLOBAL_SEND_CONCURRENCY = 40;

/** Contact page size when streaming recipients out of Postgres. */
export const CONTACT_STREAM_PAGE_SIZE = 500;

/** Meta rate-limit error codes that should trigger retry/backoff. */
export const META_RATE_LIMIT_CODES = new Set([4, 80007, 130429, 131048, 131056]);

/**
 * Meta's "healthy ecosystem engagement" throttle - Meta itself decided not
 * to deliver based on the number's trust/engagement signals. Retrying this
 * immediately does not help (it's not a transient failure) and can read as
 * spammier behavior to Meta's system, risking further quality suppression.
 * Never add this to a retry set.
 */
export const ENGAGEMENT_THROTTLE_CODE = 131049;

/** Genuinely transient delivery failures worth one automatic retry. */
export const TRANSIENT_RETRY_CODES = new Set([131026]);

/** Rolling-window sizing for the engagement-throttle circuit breaker. */
export const ENGAGEMENT_THROTTLE_WINDOW_MS = 5 * 60 * 1000; // 5 min
export const ENGAGEMENT_THROTTLE_MIN_SAMPLE = 20; // ignore tiny/noisy samples
export const ENGAGEMENT_THROTTLE_FAILURE_RATE = 0.2; // matches the 20% ask
export const ENGAGEMENT_THROTTLE_COOLDOWN_MS = 10 * 60 * 1000; // pause a send-throttled account for 10 min

export function remainingKey(campaignId: string): string {
  return `${REMAINING_KEY_PREFIX}${campaignId}`;
}

export function statsKey(accountId: string): string {
  return `${STATS_KEY_PREFIX}${accountId}`;
}

export function engagementWindowKey(accountId: string): string {
  return `wa-send:engagement-window:${accountId}`;
}

export function engagementCooldownKey(accountId: string): string {
  return `wa-send:engagement-cooldown:${accountId}`;
}
