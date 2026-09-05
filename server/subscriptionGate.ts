import type { RequestHandler } from "express";
import { authStorage } from "./auth/storage";
import { getEffectiveTrialEndsAt, hasExceededMessageQuota } from "./trialLimits";
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
    const message = `Your plan has expired or your trial has ended. Subscribe starting at ${price}/month to continue using Sampark.`;
    cachedPaywallMessage = { message, at: now };
    return message;
  } catch {
    return "Your plan has expired or your trial has ended. Subscribe to continue using Sampark.";
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
];

// Checks whether a user is allowed to send messages right now: super admins
// and users with granted free access always can, paid+active subscribers
// can, and trial users can until their trial end date passes. Everyone else
// (lapsed trial, inactive/cancelled/expired subscription) is blocked.
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const raw = await authStorage.getUser(userId);
  if (!raw) return false;

  const user = await ensureSubscriptionFresh(raw);

  if (user.role === "super_admin") return true;
  if (user.grantedFreeAccess) return true;
  if (isPaidPeriodActive(user)) return true;
  const trialEndsAt = getEffectiveTrialEndsAt(user);
  if (user.subscriptionStatus === "trial" && trialEndsAt && trialEndsAt > new Date()) {
    return true;
  }
  return false;
}

// After trial/plan expiry, block every write (POST/PUT/PATCH/DELETE) except billing
// and auth housekeeping — users can still read data and subscribe.
export const blockExpiredTrialWrites: RequestHandler = async (req, res, next) => {
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
          "You've exhausted your message quota for the current trial/subscription period. Upgrade your plan to continue.",
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
  "Your plan has expired or your trial has ended. Subscribe to continue using Sampark.";
