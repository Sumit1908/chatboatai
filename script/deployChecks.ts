/**
 * Pre-deployment checks (pure logic - see script/verify-deploy.ts for the
 * runner that gathers the inputs). Nothing here reads or prints secret values.
 */

/** The app refuses to deploy without these. */
export const REQUIRED_ENV = [
  { name: "DATABASE_URL", why: "database connection" },
  { name: "SESSION_SECRET", why: "signing login sessions" },
  {
    name: "FACEBOOK_APP_SECRET",
    why: "verifying Meta WhatsApp webhooks - without it every incoming WhatsApp message and status update is rejected",
  },
] as const;

/** Features that stay switched off (with a warning) when these are missing. */
export const RECOMMENDED_ENV = [
  { name: "FACEBOOK_APP_ID", why: "connecting WhatsApp numbers with Facebook embedded signup" },
  { name: "APP_URL", why: "links in emails and the Facebook login callback" },
  { name: "RAZORPAY_KEY_ID", why: "checkout" },
  { name: "RAZORPAY_KEY_SECRET", why: "checkout and payment verification" },
  { name: "RAZORPAY_WEBHOOK_SECRET", why: "Razorpay payment webhooks" },
  { name: "RESEND_API_KEY", why: "verification, password-reset and contact emails" },
] as const;

/** Unique indexes production depends on (duplicate contacts / WhatsApp message ids). */
export const REQUIRED_UNIQUE_INDEXES = [
  { table: "contacts", index: "contacts_account_phone_uidx", columns: "(account_id, phone)" },
  { table: "messages", index: "messages_whatsapp_id_uidx", columns: "(whatsapp_message_id)" },
] as const;

export type IndexState = {
  table: string;
  index: string;
  tableExists: boolean;
  indexExists: boolean;
  indexIsUnique: boolean;
  /** Rows that would violate the unique index (only checked when it's missing). */
  duplicateGroups: number;
};

export type CheckResult = { errors: string[]; warnings: string[] };

function isSet(value: string | undefined): boolean {
  return !!value && value.trim().length > 0;
}

export function checkEnvironment(env: Record<string, string | undefined>): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const v of REQUIRED_ENV) {
    if (!isSet(env[v.name])) errors.push(`Missing required environment variable ${v.name} (${v.why}).`);
  }
  for (const v of RECOMMENDED_ENV) {
    if (!isSet(env[v.name])) warnings.push(`${v.name} is not set - ${v.why} will not work.`);
  }
  // A test-only override must never reach production.
  const graph = env.META_GRAPH_API_ORIGIN;
  if (isSet(graph) && !/^https:\/\/graph\.facebook\.com\/?$/.test(graph!.trim())) {
    errors.push("META_GRAPH_API_ORIGIN is set to a non-Meta address. It is for tests only - remove it from this environment.");
  }
  const razorpay = env.RAZORPAY_API_ORIGIN;
  if (isSet(razorpay) && !/^https:\/\/api\.razorpay\.com\/?$/.test(razorpay!.trim())) {
    errors.push("RAZORPAY_API_ORIGIN is set to a non-Razorpay address. It is for tests only - remove it from this environment.");
  }
  return { errors, warnings };
}

export function checkIndexes(states: IndexState[]): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const s of states) {
    const spec = REQUIRED_UNIQUE_INDEXES.find((i) => i.index === s.index);
    if (!s.tableExists) {
      warnings.push(`Table ${s.table} does not exist yet (new database) - ${s.index} will be created by the migration.`);
      continue;
    }
    if (s.indexExists && s.indexIsUnique) continue;
    if (s.indexExists && !s.indexIsUnique) {
      errors.push(`Index ${s.index} on ${s.table} exists but is not UNIQUE. Recreate it as UNIQUE ${spec?.columns ?? ""} before deploying.`);
      continue;
    }
    errors.push(
      s.duplicateGroups > 0
        ? `Unique index ${s.index} is missing on ${s.table} and ${s.duplicateGroups} duplicate ${spec?.columns ?? ""} value(s) exist, so it cannot be created. Remove the duplicate rows, run "npm run db:indexes", then deploy again.`
        : `Unique index ${s.index} is missing on ${s.table}. Run "npm run db:indexes" against this database (no duplicates were found, so it will succeed), then deploy again.`,
    );
  }
  return { errors, warnings };
}
