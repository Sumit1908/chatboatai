import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { TrialCountdown } from "@/components/trial-countdown";

interface SubscriptionStatus {
  subscriptionStatus: string;
  hasPaid: boolean;
  grantedFreeAccess: boolean;
  trialEndsAt: string | null;
  isActive: boolean;
  isTrial?: boolean;
}

export function TrialStatusBadge() {
  const { data: status } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    staleTime: 1000 * 60,
  });

  if (!status || status.grantedFreeAccess || (status.hasPaid && status.subscriptionStatus === "active")) {
    return null;
  }

  const showCountdown = status.isTrial && status.trialEndsAt && status.isActive;

  return (
    <Link href="/billing">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-full border-primary/30 bg-white/80 px-3 text-primary shadow-sm hover:bg-primary/10"
        data-testid="button-trial-upgrade"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        {showCountdown ? (
          <>
            <TrialCountdown endsAt={status.trialEndsAt} className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">· Upgrade</span>
          </>
        ) : (
          <span className="text-xs sm:text-sm">Trial ended · Upgrade</span>
        )}
      </Button>
    </Link>
  );
}
