import { pool } from "./db";

type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | string;

/** Increment account rollups when a message row is inserted. */
export async function bumpAccountMessageCreated(accountId: string | null | undefined, status: MessageStatus) {
  if (!accountId) return;
  const statusExpr =
    status === "sent"
      ? ", message_sent_count = coalesce(message_sent_count, 0) + 1"
      : status === "delivered"
        ? ", message_delivered_count = coalesce(message_delivered_count, 0) + 1"
        : status === "read"
          ? ", message_read_count = coalesce(message_read_count, 0) + 1"
          : status === "failed"
            ? ", message_failed_count = coalesce(message_failed_count, 0) + 1"
            : "";

  await pool.query(
    `UPDATE whatsapp_accounts SET
       message_total_count = coalesce(message_total_count, 0) + 1,
       messaging_used = coalesce(messaging_used, 0) + 1
       ${statusExpr}
     WHERE id = $1`,
    [accountId],
  );
}

/** Move account rollups when a message status changes (webhook). */
export async function bumpAccountMessageStatusChange(
  accountId: string | null | undefined,
  fromStatus: MessageStatus | null | undefined,
  toStatus: MessageStatus,
) {
  if (!accountId || !toStatus || fromStatus === toStatus) return;

  const dec =
    fromStatus === "sent"
      ? "message_sent_count = greatest(coalesce(message_sent_count, 0) - 1, 0)"
      : fromStatus === "delivered"
        ? "message_delivered_count = greatest(coalesce(message_delivered_count, 0) - 1, 0)"
        : fromStatus === "read"
          ? "message_read_count = greatest(coalesce(message_read_count, 0) - 1, 0)"
          : fromStatus === "failed"
            ? "message_failed_count = greatest(coalesce(message_failed_count, 0) - 1, 0)"
            : null;

  const inc =
    toStatus === "sent"
      ? "message_sent_count = coalesce(message_sent_count, 0) + 1"
      : toStatus === "delivered"
        ? "message_delivered_count = coalesce(message_delivered_count, 0) + 1"
        : toStatus === "read"
          ? "message_read_count = coalesce(message_read_count, 0) + 1"
          : toStatus === "failed"
            ? "message_failed_count = coalesce(message_failed_count, 0) + 1"
            : null;

  const parts = [dec, inc].filter(Boolean);
  if (parts.length === 0) return;

  await pool.query(`UPDATE whatsapp_accounts SET ${parts.join(", ")} WHERE id = $1`, [accountId]);
}

/** Keep notification denormalized counters in sync on create. */
export async function bumpNotificationOnMessageCreate(
  campaignId: string | null | undefined,
  status: MessageStatus,
) {
  if (!campaignId) return;
  if (status === "failed") {
    await pool.query(
      `UPDATE notifications SET failed_count = coalesce(failed_count, 0) + 1 WHERE id = $1`,
      [campaignId],
    );
  } else {
    await pool.query(
      `UPDATE notifications SET sent_count = coalesce(sent_count, 0) + 1 WHERE id = $1`,
      [campaignId],
    );
  }
}

export async function bumpNotificationOnStatusChange(
  campaignId: string | null | undefined,
  fromStatus: MessageStatus | null | undefined,
  toStatus: MessageStatus,
) {
  if (!campaignId || fromStatus === toStatus) return;

  if (toStatus === "delivered" && fromStatus !== "delivered" && fromStatus !== "read") {
    await pool.query(
      `UPDATE notifications SET delivered_count = coalesce(delivered_count, 0) + 1 WHERE id = $1`,
      [campaignId],
    );
  }
  if (toStatus === "read" && fromStatus !== "read") {
    await pool.query(
      `UPDATE notifications SET
         read_count = coalesce(read_count, 0) + 1,
         delivered_count = greatest(coalesce(delivered_count, 0), coalesce(read_count, 0) + 1)
       WHERE id = $1`,
      [campaignId],
    );
  }
  if (toStatus === "failed" && fromStatus !== "failed") {
    await pool.query(
      `UPDATE notifications SET
         failed_count = coalesce(failed_count, 0) + 1,
         sent_count = greatest(coalesce(sent_count, 0) - 1, 0)
       WHERE id = $1`,
      [campaignId],
    );
  }
}

/** Upsert campaign_metrics incrementally instead of SELECT * messages. */
export async function bumpCampaignMetricsOnCreate(
  campaignId: string | null | undefined,
  accountId: string | null | undefined,
  status: MessageStatus,
) {
  if (!campaignId) return;
  const sent = status !== "failed" ? 1 : 0;
  const failed = status === "failed" ? 1 : 0;
  const delivered = status === "delivered" || status === "read" ? 1 : 0;
  const read = status === "read" ? 1 : 0;

  await pool.query(
    `INSERT INTO campaign_metrics (
       campaign_id, account_id, total_messages, sent_count, delivered_count, read_count, failed_count, last_updated_at
     ) VALUES ($1, $2, 1, $3, $4, $5, $6, NOW())
     ON CONFLICT (campaign_id) DO UPDATE SET
       total_messages = coalesce(campaign_metrics.total_messages, 0) + 1,
       sent_count = coalesce(campaign_metrics.sent_count, 0) + EXCLUDED.sent_count,
       delivered_count = coalesce(campaign_metrics.delivered_count, 0) + EXCLUDED.delivered_count,
       read_count = coalesce(campaign_metrics.read_count, 0) + EXCLUDED.read_count,
       failed_count = coalesce(campaign_metrics.failed_count, 0) + EXCLUDED.failed_count,
       last_updated_at = NOW()`,
    [campaignId, accountId || null, sent, delivered, read, failed],
  );
}

export async function adjustListCounts(listIdsToInc: string[], listIdsToDec: string[]) {
  for (const id of listIdsToInc) {
    await pool.query(
      `UPDATE contact_lists SET contact_count = coalesce(contact_count, 0) + 1, updated_at = NOW() WHERE id = $1`,
      [id],
    );
  }
  for (const id of listIdsToDec) {
    await pool.query(
      `UPDATE contact_lists SET contact_count = greatest(coalesce(contact_count, 0) - 1, 0), updated_at = NOW() WHERE id = $1`,
      [id],
    );
  }
}

export async function adjustTagCounts(tagIdsToInc: string[], tagIdsToDec: string[]) {
  for (const id of tagIdsToInc) {
    await pool.query(
      `UPDATE contact_tags SET contact_count = coalesce(contact_count, 0) + 1 WHERE id = $1`,
      [id],
    );
  }
  for (const id of tagIdsToDec) {
    await pool.query(
      `UPDATE contact_tags SET contact_count = greatest(coalesce(contact_count, 0) - 1, 0) WHERE id = $1`,
      [id],
    );
  }
}

export async function bumpAccountContactDelta(accountId: string, delta: number) {
  if (!accountId || delta === 0) return;
  await pool.query(
    `UPDATE whatsapp_accounts
     SET contact_total_count = greatest(coalesce(contact_total_count, 0) + $2, 0)
     WHERE id = $1`,
    [accountId, delta],
  );
}

export async function bumpAccountTemplateStatus(
  accountId: string | null | undefined,
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined,
) {
  if (!accountId || fromStatus === toStatus) return;
  const parts: string[] = [];
  if (fromStatus === "APPROVED") parts.push("template_approved_count = greatest(coalesce(template_approved_count, 0) - 1, 0)");
  else if (fromStatus === "PENDING") parts.push("template_pending_count = greatest(coalesce(template_pending_count, 0) - 1, 0)");
  if (toStatus === "APPROVED") parts.push("template_approved_count = coalesce(template_approved_count, 0) + 1");
  else if (toStatus === "PENDING") parts.push("template_pending_count = coalesce(template_pending_count, 0) + 1");
  if (parts.length === 0) return;
  await pool.query(`UPDATE whatsapp_accounts SET ${parts.join(", ")} WHERE id = $1`, [accountId]);
}

/** One-shot reconcile of denormalized counters from source tables. */
export async function backfillAccountCounters(accountId?: string): Promise<void> {
  const params = accountId ? [accountId] : [];
  const msgFilter = accountId ? "AND account_id = $1" : "";
  const accFilter = accountId ? "WHERE id = $1" : "";

  await pool.query(
    `UPDATE whatsapp_accounts wa SET
       message_total_count = coalesce(s.total, 0),
       message_sent_count = coalesce(s.sent, 0),
       message_delivered_count = coalesce(s.delivered, 0),
       message_read_count = coalesce(s.read, 0),
       message_failed_count = coalesce(s.failed, 0),
       messaging_used = coalesce(s.total, 0)
     FROM (
       SELECT
         account_id,
         count(*)::int AS total,
         count(*) FILTER (WHERE status = 'sent')::int AS sent,
         count(*) FILTER (WHERE status = 'delivered')::int AS delivered,
         count(*) FILTER (WHERE status = 'read')::int AS read,
         count(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM messages
       WHERE account_id IS NOT NULL ${msgFilter}
       GROUP BY account_id
     ) s
     WHERE wa.id = s.account_id`,
    params,
  );

  await pool.query(
    `UPDATE whatsapp_accounts wa SET contact_total_count = coalesce(c.cnt, 0)
     FROM (
       SELECT account_id, count(*)::int AS cnt
       FROM contacts
       WHERE true ${accountId ? "AND account_id = $1" : ""}
       GROUP BY account_id
     ) c
     WHERE wa.id = c.account_id`,
    params,
  );

  await pool.query(
    `UPDATE whatsapp_accounts wa SET
       template_approved_count = coalesce(t.approved, 0),
       template_pending_count = coalesce(t.pending, 0)
     FROM (
       SELECT
         account_id,
         count(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
         count(*) FILTER (WHERE status = 'PENDING')::int AS pending
       FROM templates
       WHERE account_id IS NOT NULL ${accountId ? "AND account_id = $1" : ""}
       GROUP BY account_id
     ) t
     WHERE wa.id = t.account_id`,
    params,
  );

  await pool.query(
    `UPDATE contact_lists cl SET contact_count = coalesce(x.cnt, 0)
     FROM (
       SELECT lid AS list_id, count(*)::int AS cnt
       FROM contacts, jsonb_array_elements_text(list_ids) AS lid
       WHERE true ${accountId ? "AND account_id = $1" : ""}
       GROUP BY lid
     ) x
     WHERE cl.id = x.list_id`,
    params,
  );

  // Zero lists with no members in scope
  if (accountId) {
    await pool.query(
      `UPDATE contact_lists SET contact_count = 0
       WHERE account_id = $1
         AND id NOT IN (
           SELECT DISTINCT lid FROM contacts, jsonb_array_elements_text(list_ids) AS lid
           WHERE account_id = $1
         )`,
      [accountId],
    );
  }

  await pool.query(
    `UPDATE contact_tags ct SET contact_count = coalesce(x.cnt, 0)
     FROM (
       SELECT tid AS tag_id, count(*)::int AS cnt
       FROM contacts, jsonb_array_elements_text(tag_ids) AS tid
       WHERE true ${accountId ? "AND account_id = $1" : ""}
       GROUP BY tid
     ) x
     WHERE ct.id = x.tag_id`,
    params,
  );

  await pool.query(
    `UPDATE campaigns SET recipient_count = coalesce(jsonb_array_length(recipients), 0)
     WHERE recipients IS NOT NULL ${accountId ? "AND account_id = $1" : ""}`,
    params,
  );

  void accFilter;
}
