import { pool } from "../db";
import { db } from "@db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

/** Mark this session as the user's only active login and revoke all others. */
export async function activateUserSession(userId: string, sessionId: string): Promise<void> {
  await db
    .update(users)
    .set({ activeSessionId: sessionId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await pool.query(
    `DELETE FROM sessions
     WHERE sid <> $1
       AND sess->'passport'->'user'->'claims'->>'sub' = $2`,
    [sessionId, userId],
  );
}

export async function getActiveSessionId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ activeSessionId: users.activeSessionId })
    .from(users)
    .where(eq(users.id, userId));
  return row?.activeSessionId ?? null;
}

/** Clear the stored active session on logout when it matches the current one. */
export async function clearActiveSessionIfMatch(userId: string, sessionId: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET active_session_id = NULL, updated_at = NOW()
     WHERE id = $1 AND active_session_id = $2`,
    [userId, sessionId],
  );
}
