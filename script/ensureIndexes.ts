/**
 * Apply all performance indexes and additive counter columns.
 * Idempotent — safe on every boot and in CI/deploy.
 *
 *   npx tsx script/ensureIndexes.ts
 */
import "dotenv/config";
import { pool } from "../server/db";

/** Additive columns for denormalized counts (never drop / rename existing). */
const COLUMNS: string[] = [
  // Single-device login — only the latest session id is valid per user
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id varchar`,
  // Per-account message rollups — dashboard/metrics without scanning messages
  `ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS message_total_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS message_sent_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS message_delivered_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS message_read_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS message_failed_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS contact_total_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS template_approved_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS template_pending_count integer NOT NULL DEFAULT 0`,
  // Campaign recipient length without parsing jsonb every list load
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recipient_count integer NOT NULL DEFAULT 0`,
];

/**
 * Indexes covering every hot filter/join. IF NOT EXISTS so re-runs are safe.
 * Prefer CONCURRENTLY outside a transaction when possible; boot path uses
 * plain CREATE INDEX IF NOT EXISTS (locks briefly, fine for our table sizes).
 */
const INDEXES: string[] = [
  // --- messages ---
  `CREATE INDEX IF NOT EXISTS messages_account_id_idx ON messages (account_id)`,
  `CREATE INDEX IF NOT EXISTS messages_account_status_idx ON messages (account_id, status)`,
  `CREATE INDEX IF NOT EXISTS messages_campaign_id_idx ON messages (campaign_id)`,
  `CREATE INDEX IF NOT EXISTS messages_campaign_status_idx ON messages (campaign_id, status)`,
  `CREATE INDEX IF NOT EXISTS messages_account_queued_at_idx ON messages (account_id, queued_at DESC)`,
  `CREATE INDEX IF NOT EXISTS messages_account_sent_at_idx ON messages (account_id, sent_at)`,
  `CREATE INDEX IF NOT EXISTS messages_campaign_phone_idx ON messages (campaign_id, recipient_phone)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS messages_whatsapp_id_uidx ON messages (whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS messages_template_id_idx ON messages (template_id)`,

  // --- contacts ---
  `CREATE INDEX IF NOT EXISTS contacts_account_id_idx ON contacts (account_id)`,
  `CREATE INDEX IF NOT EXISTS contacts_account_status_idx ON contacts (account_id, status)`,
  `CREATE INDEX IF NOT EXISTS contacts_account_created_idx ON contacts (account_id, created_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS contacts_account_phone_uidx ON contacts (account_id, phone)`,
  `CREATE INDEX IF NOT EXISTS contacts_list_ids_gin ON contacts USING GIN (list_ids)`,
  `CREATE INDEX IF NOT EXISTS contacts_tag_ids_gin ON contacts USING GIN (tag_ids)`,

  // --- conversations / inbox ---
  `CREATE INDEX IF NOT EXISTS conversations_account_id_idx ON conversations (account_id)`,
  `CREATE INDEX IF NOT EXISTS conversations_account_phone_idx ON conversations (account_id, contact_phone)`,
  `CREATE INDEX IF NOT EXISTS conversations_account_status_idx ON conversations (account_id, status)`,
  `CREATE INDEX IF NOT EXISTS conversation_messages_conv_sent_idx ON conversation_messages (conversation_id, sent_at DESC)`,
  `CREATE INDEX IF NOT EXISTS conversation_messages_inbound_idx ON conversation_messages (conversation_id) WHERE direction = 'inbound'`,

  // --- templates ---
  `CREATE INDEX IF NOT EXISTS templates_account_id_idx ON templates (account_id)`,
  `CREATE INDEX IF NOT EXISTS templates_account_status_idx ON templates (account_id, status)`,
  `CREATE INDEX IF NOT EXISTS templates_account_name_idx ON templates (account_id, name)`,
  `CREATE INDEX IF NOT EXISTS templates_meta_id_idx ON templates (meta_template_id)`,

  // --- notifications / campaigns ---
  `CREATE INDEX IF NOT EXISTS notifications_account_id_idx ON notifications (account_id)`,
  `CREATE INDEX IF NOT EXISTS notifications_account_created_idx ON notifications (account_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS notifications_account_status_idx ON notifications (account_id, status)`,
  `CREATE INDEX IF NOT EXISTS campaigns_account_id_idx ON campaigns (account_id)`,
  `CREATE INDEX IF NOT EXISTS campaigns_account_created_idx ON campaigns (account_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS campaigns_account_status_idx ON campaigns (account_id, status)`,
  `CREATE INDEX IF NOT EXISTS campaign_metrics_account_idx ON campaign_metrics (account_id)`,

  // --- lists / tags ---
  `CREATE INDEX IF NOT EXISTS contact_lists_account_idx ON contact_lists (account_id)`,
  `CREATE INDEX IF NOT EXISTS contact_tags_account_idx ON contact_tags (account_id)`,

  // --- accounts / team / activity ---
  `CREATE INDEX IF NOT EXISTS whatsapp_accounts_user_id_idx ON whatsapp_accounts (user_id)`,
  `CREATE INDEX IF NOT EXISTS whatsapp_accounts_phone_number_id_idx ON whatsapp_accounts (phone_number_id)`,
  `CREATE INDEX IF NOT EXISTS team_members_account_idx ON team_members (account_id)`,
  `CREATE INDEX IF NOT EXISTS team_members_member_user_idx ON team_members (member_user_id, status)`,
  `CREATE INDEX IF NOT EXISTS team_members_member_email_idx ON team_members (member_email, status)`,
  `CREATE INDEX IF NOT EXISTS activities_account_ts_idx ON activities (account_id, timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS active_accounts_account_id_idx ON active_accounts (account_id)`,

  // --- uploads ---
  `CREATE INDEX IF NOT EXISTS uploaded_files_user_id_idx ON uploaded_files (user_id)`,
  `CREATE INDEX IF NOT EXISTS uploaded_files_storage_key_idx ON uploaded_files (storage_key) WHERE storage_key IS NOT NULL`,
];

export async function ensureSchemaPerformance(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const sql of COLUMNS) {
      await client.query(sql);
    }
    for (const sql of INDEXES) {
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}

async function main() {
  const t0 = Date.now();
  console.log("[db] ensuring indexes + counter columns...");
  await ensureSchemaPerformance();
  console.log(`[db] done in ${Date.now() - t0}ms`);
  await pool.end();
}

// Allow `npx tsx script/ensureIndexes.ts`
const isDirect = process.argv[1]?.includes("ensureIndexes");
if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
