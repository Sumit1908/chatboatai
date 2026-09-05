import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialCountdown } from "@/components/trial-countdown";

interface TrialUsage {
  contactCount: number;
  contactLimit: number;
  contactsRemaining: number;
  messagesSentTotal: number;
  messageTotalLimit: number;
  messagesRemainingTotal: number;
}

interface SubscriptionStatus {
  subscriptionStatus: string;
  hasPaid: boolean;
  grantedFreeAccess: boolean;
  trialEndsAt: string | null;
  isActive: boolean;
  trialDays?: number;
  isTrial?: boolean;
  trialUsage?: TrialUsage | null;
}

export function TrialLimitsBanner() {
  const { data: status } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    staleTime: 1000 * 30,
    refetchInterval: 60_000,
  });

  if (!status || status.grantedFreeAccess || (status.hasPaid && status.subscriptionStatus === "active")) {
    return null;
  }

  if (!status.isActive) {
    return (
      <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your free trial has ended. Subscribe to continue creating campaigns, adding contacts,
              and sending messages.
            </span>
          </div>
          <Link href="/billing">
            <Button size="sm" variant="destructive" className="shrink-0">
              Subscribe now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!status.isTrial || !status.trialUsage) return null;

  const { trialUsage } = status;

  return (
    <div className="border-b border-primary/15 bg-primary/5 px-4 py-2.5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">
        <TrialCountdown
          endsAt={status.trialEndsAt}
          prefix="Trial ends in"
          className="font-medium text-primary"
        />
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {trialUsage.contactCount}/{trialUsage.contactLimit} contacts
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          {trialUsage.messagesSentTotal}/{trialUsage.messageTotalLimit} messages used
        </span>
        <Link href="/billing" className="ml-auto text-primary underline-offset-4 hover:underline">
          Upgrade for unlimited access
        </Link>
      </div>
    </div>
  );
}
