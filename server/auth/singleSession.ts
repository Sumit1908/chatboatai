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

/**
 * Revoke every session for a user, with no exception — unlike
 * activateUserSession above (which keeps the caller's own session alive),
 * this is for security events where nothing that existed before should
 * keep working: currently only a successful password reset, which must
 * force a fresh login everywhere, not just on other devices.
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ activeSessionId: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await pool.query(
    `DELETE FROM sessions
     WHERE sess->'passport'->'user'->'claims'->>'sub' = $1`,
    [userId],
  );
}
