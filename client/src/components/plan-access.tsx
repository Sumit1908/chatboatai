import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Redirect, useLocation } from "wouter";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ChatBoatAI is a paid product (no free trial). A signed-in account without an
 * active plan - new sign-ups, lapsed subscriptions - can only choose a plan
 * and manage its account until it pays. The server enforces the same rule
 * (subscriptionGate.ts blocks writes); this keeps the UI in step with it.
 */
type PlanStatus = {
  isActive: boolean;
  accessSource?: "own" | "team" | "none";
};

/** Pages an account without a plan can still open. */
const NO_PLAN_PATHS = ["/billing", "/settings"];

const isNoPlanPath = (location: string) => NO_PLAN_PATHS.some((p) => location === p || location.startsWith(`${p}/`));

export function usePlanStatus() {
  return useQuery<PlanStatus>({ queryKey: ["/api/subscription/status"] });
}

/** Sends accounts without an active plan to Billing ("choose a plan"). */
export function PlanGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: status, isLoading } = usePlanStatus();
  if (isLoading) return null;
  if (status && !status.isActive && !isNoPlanPath(location)) return <Redirect to="/billing" />;
  return <>{children}</>;
}

/** Shown above every page except Billing while the account has no plan. */
export function PlanRequiredBanner() {
  const [location] = useLocation();
  const { data: status } = usePlanStatus();
  if (!status || status.isActive || location === "/billing") return null;
  return (
    <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-3" data-testid="banner-plan-required">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your account doesn&apos;t have an active plan. Choose a plan to start using ChatBoatAI.</span>
        </div>
        <Link href="/billing">
          <Button size="sm" className="shrink-0">
            Choose a plan
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Header shortcut to Billing while the account has no plan. */
export function PlanStatusBadge() {
  const { data: status } = usePlanStatus();
  if (!status || status.isActive) return null;
  return (
    <Link href="/billing">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-full border-primary/30 bg-white/80 px-3 text-primary shadow-sm hover:bg-primary/10"
        data-testid="button-choose-plan"
      >
        <CreditCard className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs sm:text-sm">No active plan · Choose a plan</span>
      </Button>
    </Link>
  );
}
