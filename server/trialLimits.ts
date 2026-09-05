import { db } from "@db";
import {
  contacts,
  conversationMessages,
  conversations,
  messages,
  templates,
  teamMembers,
  whatsappAccounts,
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import type { BillingPlan } from "@shared/billingPlans";
import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { getBillingPlanById } from "./billingPlans";

export const TRIAL_DAYS = 7;
export const TRIAL_MAX_CONTACTS = 100;
export const TRIAL_MAX_MESSAGES_TOTAL = 1000;

export const TRIAL_CONTACT_LIMIT_MESSAGE = `Trial accounts can add up to ${TRIAL_MAX_CONTACTS} contacts. Subscribe to add more.`;
export const TRIAL_MESSAGE_LIMIT_MESSAGE = `Trial accounts can send up to ${TRIAL_MAX_MESSAGES_TOTAL} total messages in the trial period. Subscribe to send more.`;

const MS_PER_TRIAL_DAY = 24 * 60 * 60 * 1000;

/** Cap trial at TRIAL_DAYS from signup — fixes accounts created with a longer trial. */
export function getEffectiveTrialEndsAt(user: User): Date | null {
  if (user.subscriptionStatus !== "trial" || !user.trialEndsAt) return null;

  const storedEnd = new Date(user.trialEndsAt);
  if (!user.createdAt) return storedEnd;

  const cappedEnd = new Date(new Date(user.createdAt).getTime() + TRIAL_DAYS * MS_PER_TRIAL_DAY);
  return storedEnd < cappedEnd ? storedEnd : cappedEnd;
}

export function isTrialUser(user: User): boolean {
  if (user.role === "super_admin" || user.grantedFreeAccess) return false;
  if (user.hasPaid && user.subscriptionStatus === "active") return false;

  const endsAt = getEffectiveTrialEndsAt(user);
  return user.subscriptionStatus === "trial" && !!endsAt && endsAt > new Date();
}

export function isPaidActiveUser(user: User): boolean {
  if (user.role === "super_admin" || user.grantedFreeAccess) return false;
  if (!(user.hasPaid && user.subscriptionStatus === "active")) return false;
  if (user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) <= new Date()) {
    return false;
  }
  return true;
}

function addMonths(from: Date, months = 1): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function getUserAccountIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: whatsappAccounts.id })
    .from(whatsappAccounts)
    .where(eq(whatsappAccounts.userId, userId));
  return rows.map((row) => row.id);
}

export async function countUserContacts(userId: string): Promise<number> {
  const accountIds = await getUserAccountIds(userId);
  if (accountIds.length === 0) return 0;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(inArray(contacts.accountId, accountIds));

  return Number(row?.count) || 0;
}

export async function countUserMessagesSentInWindow(
  userId: string,
  since?: Date | null,
): Promise<number> {
  // Aggregate across ALL WhatsApp numbers owned by the user.
  // Count only successfully sent messages (exclude queued/draft/failed).
  const accountIds = await getUserAccountIds(userId);
  if (accountIds.length === 0) return 0;

  const [broadcastRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        inArray(messages.accountId, accountIds),
        sql`${messages.sentAt} IS NOT NULL`,
        since ? gte(messages.sentAt, since) : sql`true`,
        inArray(messages.status, ["sent", "delivered", "read"]),
      ),
    );

  const [inboxRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(
      and(
        inArray(conversations.accountId, accountIds),
        or(
          eq(conversationMessages.direction, "outbound"),
          eq(conversationMessages.direction, "outgoing"),
        ),
        sql`${conversationMessages.sentAt} IS NOT NULL`,
        since ? gte(conversationMessages.sentAt, since) : sql`true`,
        sql`${conversationMessages.status} IS NULL OR ${conversationMessages.status} <> 'failed'`,
      ),
    );

  return (Number(broadcastRow?.count) || 0) + (Number(inboxRow?.count) || 0);
}

export async function countUserWhatsappNumbers(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(whatsappAccounts)
    .where(eq(whatsappAccounts.userId, userId));
  return Number(row?.count) || 0;
}

export async function countUserTemplates(userId: string): Promise<number> {
  const accountIds = await getUserAccountIds(userId);
  if (accountIds.length === 0) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(templates)
    .where(inArray(templates.accountId, accountIds));
  return Number(row?.count) || 0;
}

export async function countUserTeamSeats(accountId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teamMembers)
    .where(and(eq(teamMembers.accountId, accountId), sql`${teamMembers.status} <> 'revoked'`));
  // +1 for the owner seat
  return (Number(row?.count) || 0) + 1;
}

type LimitResult = { ok: true } | { ok: false; message: string; code: string };

async function resolvePlanLimits(user: User): Promise<{
  mode: "none" | "trial" | "plan";
  plan?: BillingPlan;
  maxContacts: number | null;
  maxMessagesTotal: number | null;
  maxWhatsappNumbers: number | null;
  maxTemplates: number | null;
  maxTeamSeats: number | null;
  usageWindowStart: Date | null;
}> {
  if (user.role === "super_admin" || user.grantedFreeAccess) {
    return {
      mode: "none",
      maxContacts: null,
      maxMessagesTotal: null,
      maxWhatsappNumbers: null,
      maxTemplates: null,
      maxTeamSeats: null,
      usageWindowStart: null,
    };
  }

  if (isTrialUser(user)) {
    return {
      mode: "trial",
      maxContacts: TRIAL_MAX_CONTACTS,
      maxMessagesTotal: TRIAL_MAX_MESSAGES_TOTAL,
      maxWhatsappNumbers: 1,
      maxTemplates: null,
      maxTeamSeats: 1,
      usageWindowStart: user.createdAt ? new Date(user.createdAt) : null,
    };
  }

  if (isPaidActiveUser(user) && user.billingPlanId) {
    const plan = await getBillingPlanById(user.billingPlanId);
    if (plan) {
      return {
        mode: "plan",
        plan,
        maxContacts: plan.maxContacts,
        maxMessagesTotal: plan.maxMessagesPerDay,
        maxWhatsappNumbers: plan.maxWhatsappNumbers,
        maxTemplates: plan.maxTemplates,
        maxTeamSeats: plan.maxTeamSeats,
        usageWindowStart: user.subscriptionEndsAt
          ? addMonths(new Date(user.subscriptionEndsAt), -1)
          : user.createdAt
            ? new Date(user.createdAt)
            : null,
      };
    }
  }

  return {
    mode: "none",
    maxContacts: null,
    maxMessagesTotal: null,
    maxWhatsappNumbers: null,
    maxTemplates: null,
    maxTeamSeats: null,
    usageWindowStart: null,
  };
}

export async function getTrialUsage(userId: string) {
  const [contactCount, messagesSentTotal] = await Promise.all([
    countUserContacts(userId),
    countUserMessagesSentInWindow(userId),
  ]);

  return {
    contactCount,
    contactLimit: TRIAL_MAX_CONTACTS,
    contactsRemaining: Math.max(0, TRIAL_MAX_CONTACTS - contactCount),
    messagesSentTotal,
    messageTotalLimit: TRIAL_MAX_MESSAGES_TOTAL,
    messagesRemainingTotal: Math.max(0, TRIAL_MAX_MESSAGES_TOTAL - messagesSentTotal),
  };
}

export async function getPlanUsage(user: User) {
  const limits = await resolvePlanLimits(user);
  const [contactCount, messagesSentTotal, whatsappNumbers, templateCount] = await Promise.all([
    countUserContacts(user.id),
    countUserMessagesSentInWindow(user.id, limits.usageWindowStart),
    countUserWhatsappNumbers(user.id),
    countUserTemplates(user.id),
  ]);

  const remaining = (limit: number | null, used: number) =>
    limit == null ? null : Math.max(0, limit - used);

  return {
    mode: limits.mode,
    plan: limits.plan
      ? { id: limits.plan.id, name: limits.plan.name, priceLabel: limits.plan.priceLabel }
      : null,
    contactCount,
    contactLimit: limits.maxContacts,
    contactsRemaining: remaining(limits.maxContacts, contactCount),
    messagesSentTotal,
    messageTotalLimit: limits.maxMessagesTotal,
    messagesRemainingTotal: remaining(limits.maxMessagesTotal, messagesSentTotal),
    whatsappNumbers,
    whatsappNumberLimit: limits.maxWhatsappNumbers,
    templateCount,
    templateLimit: limits.maxTemplates,
  };
}

export async function assertCanAddContacts(
  user: User,
  additionalContacts: number,
): Promise<LimitResult> {
  if (additionalContacts <= 0) return { ok: true };
  const limits = await resolvePlanLimits(user);
  if (limits.maxContacts == null) return { ok: true };

  const current = await countUserContacts(user.id);
  if (current + additionalContacts > limits.maxContacts) {
    return {
      ok: false,
      code: limits.mode === "trial" ? "trial_contact_limit" : "plan_contact_limit",
      message:
        limits.mode === "trial"
          ? TRIAL_CONTACT_LIMIT_MESSAGE
          : `Your ${limits.plan?.name ?? "current"} plan allows up to ${limits.maxContacts.toLocaleString("en-IN")} contacts. Upgrade to add more.`,
    };
  }
  return { ok: true };
}

export async function assertCanSendMessages(
  user: User,
  messageCount: number,
): Promise<LimitResult> {
  if (messageCount <= 0) return { ok: true };
  const limits = await resolvePlanLimits(user);
  if (limits.maxMessagesTotal == null) return { ok: true };

  const sentTotal = await countUserMessagesSentInWindow(user.id, limits.usageWindowStart);
  if (sentTotal + messageCount > limits.maxMessagesTotal) {
    const remaining = Math.max(0, limits.maxMessagesTotal - sentTotal);
    return {
      ok: false,
      code: limits.mode === "trial" ? "trial_message_limit" : "plan_message_limit",
      message:
        remaining > 0
          ? `You can only send ${remaining} more message${remaining === 1 ? "" : "s"} in your current ${limits.mode === "trial" ? "trial" : "subscription"} period.`
          : limits.mode === "trial"
            ? TRIAL_MESSAGE_LIMIT_MESSAGE
            : `Your ${limits.plan?.name ?? "current"} plan allows ${limits.maxMessagesTotal.toLocaleString("en-IN")} total messages per subscription period. Upgrade to send more.`,
    };
  }
  return { ok: true };
}

export async function hasExceededMessageQuota(user: User): Promise<boolean> {
  const limits = await resolvePlanLimits(user);
  if (limits.maxMessagesTotal == null) return false;
  const sentTotal = await countUserMessagesSentInWindow(user.id, limits.usageWindowStart);
  return sentTotal >= limits.maxMessagesTotal;
}

export async function assertCanAddWhatsappNumber(user: User): Promise<LimitResult> {
  const limits = await resolvePlanLimits(user);
  if (limits.maxWhatsappNumbers == null) return { ok: true };

  const current = await countUserWhatsappNumbers(user.id);
  if (current >= limits.maxWhatsappNumbers) {
    return {
      ok: false,
      code: "plan_whatsapp_limit",
      message:
        limits.mode === "trial"
          ? "Trial accounts can connect 1 WhatsApp number. Subscribe to add more."
          : `Your ${limits.plan?.name ?? "current"} plan allows ${limits.maxWhatsappNumbers} WhatsApp number${limits.maxWhatsappNumbers === 1 ? "" : "s"}. Upgrade to add more.`,
    };
  }
  return { ok: true };
}

export async function assertCanCreateTemplate(user: User): Promise<LimitResult> {
  const limits = await resolvePlanLimits(user);
  if (limits.maxTemplates == null) return { ok: true };

  const current = await countUserTemplates(user.id);
  if (current >= limits.maxTemplates) {
    return {
      ok: false,
      code: "plan_template_limit",
      message: `Your ${limits.plan?.name ?? "current"} plan allows ${limits.maxTemplates} templates. Upgrade to create more.`,
    };
  }
  return { ok: true };
}

export async function assertCanAddTeamSeat(
  user: User,
  accountId: string,
): Promise<LimitResult> {
  const limits = await resolvePlanLimits(user);
  if (limits.maxTeamSeats == null) return { ok: true };

  const current = await countUserTeamSeats(accountId);
  if (current >= limits.maxTeamSeats) {
    return {
      ok: false,
      code: "plan_seat_limit",
      message: `Your ${limits.plan?.name ?? "current"} plan allows ${limits.maxTeamSeats} team seat${limits.maxTeamSeats === 1 ? "" : "s"}. Upgrade to invite more.`,
    };
  }
  return { ok: true };
}

/** Count how many imported rows would create new contacts (not updates). */
export async function countNewContactsForImport(
  accountId: string,
  phones: string[],
): Promise<number> {
  const uniquePhones = Array.from(new Set(phones.filter(Boolean)));
  if (uniquePhones.length === 0) return 0;

  const existingRows = await db
    .select({ phone: contacts.phone })
    .from(contacts)
    .where(and(eq(contacts.accountId, accountId), inArray(contacts.phone, uniquePhones)));

  const existing = new Set(existingRows.map((row) => row.phone));
  return uniquePhones.filter((phone) => !existing.has(phone)).length;
}
