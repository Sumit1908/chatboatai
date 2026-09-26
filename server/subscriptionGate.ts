import type { RequestHandler } from "express";
import { authStorage } from "./auth/storage";
import type { User } from "@shared/models/auth";
import { hasExceededMessageQuota } from "./planLimits";
import { storage } from "./storage";
import { getCheapestActivePlan } from "./billingPlans";
import {
  ensureSubscriptionFresh,
  isPaidPeriodActive,
} from "./subscriptionLifecycle";

let cachedPaywallMessage: { message: string; at: number } | null = null;

async function getSubscriptionRequiredMessage(): Promise<string> {
  const now = Date.now();
  if (cachedPaywallMessage && now - cachedPaywallMessage.at < 60_000) {
    return cachedPaywallMessage.message;
  }
  try {
    const cheapest = await getCheapestActivePlan();
    const price = cheapest?.priceLabel ?? "a paid plan";
    const message = `An active plan is required. Choose a plan (from ${price}/month) in Billing to continue using ChatBoatAI.`;
    cachedPaywallMessage = { message, at: now };
    return message;
  } catch {
    return SUBSCRIPTION_REQUIRED_MESSAGE;
  }
}

const MUTATION_WHITELIST_PREFIXES = [
  "/api/login",
  "/api/register",
  "/api/logout",
  "/api/subscription/create",
  "/api/subscription/upgrade",
  "/api/subscription/confirm",
  "/api/resend-verification",
  "/api/webhooks/",
  "/api/verify-email",
  "/api/admin/",
  // Account housekeeping that must work without a plan.
  "/api/forgot-password",
  "/api/reset-password",
  "/api/auth/change-password",
  "/api/user/delete-account",
  "/api/team-members/accept",
  "/api/team-members/check-invites",
  "/api/contact-inquiry",
  "/api/analytics/pageview",
];

/** Access from the user's own account: super admin, admin-granted free access, or a paid plan. */
function hasOwnAccess(user: User): boolean {
  return user.role === "super_admin" || !!user.grantedFreeAccess || isPaidPeriodActive(user);
}

/**
 * Whether a user may use the app (create, send, edit) right now. There is no
 * free trial: access comes from super admin / admin-granted free access, the
 * user's own paid plan, or - for a team member - the paid plan of the owner
 * of the WhatsApp number they're working in (that owner's plan includes up
 * to its user limit of people). Everyone else is read-only and can pay.
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  return (await getAccessSource(userId)) !== "none";
}

export type AccessSource = "own" | "team" | "none";

export async function getAccessSource(userId: string): Promise<AccessSource> {
  const raw = await authStorage.getUser(userId);
  if (!raw) return "none";
  const user = await ensureSubscriptionFresh(raw);
  if (hasOwnAccess(user)) return "own";

  const active = await storage.getActiveAccountWithDetails(userId);
  const ownerId = active?.account.userId;
  if (ownerId && ownerId !== userId) {
    const rawOwner = await authStorage.getUser(ownerId);
    if (rawOwner && hasOwnAccess(await ensureSubscriptionFresh(rawOwner))) return "team";
  }
  return "none";
}

// Without an active plan, block every write (POST/PUT/PATCH/DELETE) except
// billing and account housekeeping - users can still sign in, read and pay.
export const blockUnpaidWrites: RequestHandler = async (req, res, next) => {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  const userId = (req as any).user?.claims?.sub as string | undefined;
  if (!userId) return next();

  if (MUTATION_WHITELIST_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  if (await hasActiveSubscription(userId)) {
    const user = await authStorage.getUser(userId);
    if (user && (await hasExceededMessageQuota(user))) {
      return res.status(402).json({
        error: "message_quota_exhausted",
        message:
          "You've used your plan's message quota for the current subscription period. Upgrade your plan to continue.",
      });
    }
    return next();
  }

  return res.status(402).json({
    error: "subscription_required",
    message: await getSubscriptionRequiredMessage(),
  });
};

export const requireActiveSubscription: RequestHandler = async (req: any, res, next) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (await hasActiveSubscription(userId)) {
    return next();
  }

  return res.status(402).json({
    error: "subscription_required",
    message: await getSubscriptionRequiredMessage(),
  });
};

const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  "Please verify your email address before sending messages. Check your inbox for the verification link.";

export const requireVerifiedEmail: RequestHandler = async (req: any, res, next) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await authStorage.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (user.role === "super_admin" || user.emailVerified) {
    return next();
  }

  return res.status(403).json({
    error: "email_verification_required",
    message: EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  });
};

export {
  getSubscriptionRequiredMessage as SUBSCRIPTION_REQUIRED_MESSAGE_FN,
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
};

export const SUBSCRIPTION_REQUIRED_MESSAGE =
  "An active plan is required. Choose a plan in Billing to continue using ChatBoatAI.";
