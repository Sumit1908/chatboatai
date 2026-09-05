import { db } from "@db";
import { eq, inArray, or, sql } from "drizzle-orm";
import { users, adminAuditLog, pageViews } from "@shared/models/auth";
import {
  whatsappAccounts,
  activeAccounts,
  contacts,
  contactLists,
  contactTags,
  conversations,
  conversationMessages,
  messages,
  campaigns,
  campaignMetrics,
  templates,
  notifications,
  activities,
  teamMembers,
  uploadedFiles,
  billingPayments,
} from "@shared/schema";
import { storage } from "./storage";
import * as objectStorage from "./objectStorage";

export type UserDeletionResult = {
  accountsDeleted: number;
  filesDeleted: number;
};

async function deleteUploadedFilesForUser(userId: string, phoneNumberIds: string[]): Promise<number> {
  const conditions = [eq(uploadedFiles.userId, userId)];
  if (phoneNumberIds.length > 0) {
    conditions.push(inArray(uploadedFiles.phoneNumberId, phoneNumberIds));
  }

  const files = await db
    .select()
    .from(uploadedFiles)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions));

  for (const file of files) {
    if (file.storageKey) {
      try {
        await objectStorage.deleteObject(file.storageKey);
      } catch (error) {
        console.error("[userDeletion] Failed to delete R2 object:", file.storageKey, error);
      }
    }
  }

  if (files.length === 0) return 0;

  await db.delete(uploadedFiles).where(
    inArray(
      uploadedFiles.id,
      files.map((f) => f.id),
    ),
  );

  return files.length;
}

/** Permanently delete a user and all tenant data (accounts, contacts, campaigns, etc.). */
export async function deleteAllUserData(userId: string): Promise<UserDeletionResult> {
  const accounts = await storage.getAccountsByUser(userId);
  const accountIds = accounts.map((a) => a.id);
  const phoneNumberIds = accounts.map((a) => a.phoneNumberId).filter(Boolean);

  const filesDeleted = await deleteUploadedFilesForUser(userId, phoneNumberIds);

  if (accountIds.length > 0) {
    await db.delete(conversationMessages).where(
      inArray(
        conversationMessages.conversationId,
        db.select({ id: conversations.id }).from(conversations).where(inArray(conversations.accountId, accountIds)),
      ),
    );

    await db.delete(conversations).where(inArray(conversations.accountId, accountIds));
    await db.delete(messages).where(inArray(messages.accountId, accountIds));

    await db.delete(campaignMetrics).where(
      inArray(
        campaignMetrics.campaignId,
        db.select({ id: campaigns.id }).from(campaigns).where(inArray(campaigns.accountId, accountIds)),
      ),
    );

    await db.delete(campaigns).where(inArray(campaigns.accountId, accountIds));
    await db.delete(notifications).where(inArray(notifications.accountId, accountIds));
    await db.delete(contacts).where(inArray(contacts.accountId, accountIds));
    await db.delete(contactLists).where(inArray(contactLists.accountId, accountIds));
    await db.delete(contactTags).where(inArray(contactTags.accountId, accountIds));
    await db.delete(templates).where(inArray(templates.accountId, accountIds));
    await db.delete(activities).where(inArray(activities.accountId, accountIds));

    await db.delete(teamMembers).where(
      or(
        inArray(teamMembers.accountId, accountIds),
        eq(teamMembers.ownerUserId, userId),
        eq(teamMembers.memberUserId, userId),
      ),
    );

    // active_accounts.account_id references whatsapp_accounts — remove first.
    await db.delete(activeAccounts).where(eq(activeAccounts.userId, userId));
    await db.delete(whatsappAccounts).where(eq(whatsappAccounts.userId, userId));
  } else {
    await db.delete(teamMembers).where(
      or(eq(teamMembers.ownerUserId, userId), eq(teamMembers.memberUserId, userId)),
    );
  }

  await db.delete(billingPayments).where(eq(billingPayments.userId, userId));
  await db.delete(pageViews).where(eq(pageViews.userId, userId));
  await db.delete(adminAuditLog).where(
    or(eq(adminAuditLog.targetUserId, userId), eq(adminAuditLog.actorUserId, userId)),
  );

  await db.execute(sql`
    DELETE FROM sessions
    WHERE sess->'passport'->'user'->'claims'->>'sub' = ${userId}
  `);

  const deletedUsers = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
  if (deletedUsers.length === 0) {
    throw new Error("User record was not deleted");
  }

  return {
    accountsDeleted: accountIds.length,
    filesDeleted,
  };
}
