import IORedis from "ioredis";

let sharedConnection: IORedis | null = null;

/**
 * BullMQ needs the Redis protocol (not Upstash REST). Prefer REDIS_URL;
 * otherwise build rediss:// from UPSTASH_REDIS_REST_URL + TOKEN.
 */
export function getRedisUrl(): string | null {
  if (process.env.REDIS_URL?.trim()) {
    return process.env.REDIS_URL.trim();
  }

  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!restUrl || !token) return null;

  try {
    const host = new URL(restUrl).hostname;
    return `rediss://default:${encodeURIComponent(token)}@${host}:6379`;
  } catch {
    return null;
  }
}

export function isQueueEnabled(): boolean {
  return Boolean(getRedisUrl());
}

export function getRedisConnection(): IORedis {
  if (sharedConnection) return sharedConnection;

  const url = getRedisUrl();
  if (!url) {
    throw new Error(
      "Redis is not configured. Set REDIS_URL or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  sharedConnection = new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    // Upstash idle timeouts are aggressive; keep the link warm.
    keepAlive: 10000,
  });

  sharedConnection.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });

  return sharedConnection;
}

/** BullMQ wants a plain connection options object (it creates its own clients). */
export function getBullMqConnectionOptions(): { url: string; maxRetriesPerRequest: null } {
  const url = getRedisUrl();
  if (!url) {
    throw new Error("Redis is not configured for BullMQ.");
  }
  return { url, maxRetriesPerRequest: null };
}

export async function closeRedisConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
}
