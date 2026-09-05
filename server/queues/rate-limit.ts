/**
 * Map Meta messaging tiers / throughput to a safe per-second send budget.
 * messaging_limit_tier is a 24h unique-conversation cap — we still pace MPS
 * so we never stampede the Cloud API. Throughput level (when present) can
 * raise the ceiling slightly.
 *
 * Quality rating caps the ceiling separately from tier: an UNKNOWN/RED
 * number is exactly the case Meta's "healthy ecosystem engagement" throttle
 * (error 131049) targets, regardless of how large its 24h tier is - sending
 * fast just burns through the batch into a wall of throttled failures.
 */
export function messagesPerSecondForAccount(opts: {
  messagingLimit?: number | null;
  throughputLevel?: string | null;
  qualityRating?: string | null;
}): number {
  const limit = opts.messagingLimit ?? 0;
  const throughput = (opts.throughputLevel || "").toUpperCase();
  const quality = (opts.qualityRating || "UNKNOWN").toUpperCase();

  let mps: number;
  if (limit <= 0) {
    // Unknown tier — be conservative
    mps = 8;
  } else if (limit <= 250) {
    mps = 5;
  } else if (limit <= 1000) {
    mps = 10;
  } else if (limit <= 2000) {
    mps = 12;
  } else if (limit <= 10000) {
    mps = 20;
  } else if (limit <= 100000) {
    mps = 40;
  } else {
    mps = 50;
  }

  if (throughput === "HIGH" || throughput === "VERY_HIGH") {
    mps = Math.min(80, Math.round(mps * 1.5));
  }

  // A number with no track record yet (or a already-declining one) gets a
  // hard ceiling well below what its tier alone would allow.
  if (quality === "UNKNOWN") {
    mps = Math.min(mps, 2);
  } else if (quality === "RED") {
    mps = Math.min(mps, 1);
  } else if (quality === "YELLOW") {
    mps = Math.min(mps, 5);
  }

  return Math.max(1, Math.min(mps, 50));
}

/** BullMQ worker limiter: max jobs completed per duration window. */
export function bullMqLimiterForAccount(opts: {
  messagingLimit?: number | null;
  throughputLevel?: string | null;
  qualityRating?: string | null;
}): { max: number; duration: number } {
  const mps = messagesPerSecondForAccount(opts);
  // Each job sends up to PHONES_PER_JOB messages; budget jobs/sec accordingly.
  const phonesPerJob = 10;
  const jobsPerSec = Math.max(1, Math.ceil(mps / phonesPerJob));
  return { max: jobsPerSec, duration: 1000 };
}
