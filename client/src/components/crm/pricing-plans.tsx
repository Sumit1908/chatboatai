import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Headphones, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/marketing-layout";
import { useAuth } from "@/hooks/use-auth";
import { usePublicPlans, type PublicBillingPlan } from "@/hooks/use-public-plans";
import { useRazorpayCheckout } from "@/hooks/use-razorpay-checkout";
import { accentButton } from "./brand";
import { CheckoutAuthDialog } from "./checkout-auth-dialog";

/**
 * Plan cards for the public site. Everything comes from GET /api/plans - the
 * same billing_plans rows Admin -> Pricing Plans edits - so prices, features,
 * "featured" and visibility are never duplicated in code.
 *
 * "Pay Now" goes straight into the EXISTING Razorpay checkout (the shared
 * useRazorpayCheckout, also used by Billing). Only the plan id is sent; the
 * server prices it. Signed-out visitors first create an account / log in in a
 * dialog (a subscription must belong to an account), then checkout opens.
 */
type SubscriptionStatus = {
  subscriptionStatus: string;
  hasPaid: boolean;
  grantedFreeAccess: boolean;
  billingPlanId?: string | null;
};

type CardAction =
  | { kind: "link"; href: string; label: string; note: string | null }
  | { kind: "pay"; upgrade: boolean; note: string | null }
  | { kind: "disabled"; label: string; note: string | null };

/** Plans whose secondary button is "Contact Sales" instead of "Create Account". */
const SALES_LED_SLUGS = new Set(["scale"]);
const PAY_NOTE = "Secure Online Payment • Instant Account Activation";

/** "Service: ..." features are support delivered by the team, not software. */
const SERVICE_PREFIX = /^service:\s*/i;
function splitFeatures(features: string[]) {
  return {
    product: features.filter((f) => !SERVICE_PREFIX.test(f)),
    service: features.filter((f) => SERVICE_PREFIX.test(f)).map((f) => f.replace(SERVICE_PREFIX, "")),
  };
}

function planAction(plan: PublicBillingPlan, plans: PublicBillingPlan[], status: SubscriptionStatus | undefined): CardAction {
  if (!plan.razorpayEnabled) {
    // Sales-led plan (Admin: "Razorpay self-serve checkout" off) - set up with our team.
    return { kind: "link", href: "/contact", label: "Talk to Us", note: "We'll set this plan up with you." };
  }
  if (plan.checkoutAvailable === false) {
    return { kind: "link", href: "/contact", label: "Contact us", note: "Online payment is temporarily unavailable." };
  }
  if (status?.grantedFreeAccess) {
    return { kind: "disabled", label: "Access already active", note: null };
  }
  const paidActive = !!status?.hasPaid && status.subscriptionStatus === "active" && !!status.billingPlanId;
  if (paidActive) {
    const current = plans.find((p) => p.id === status.billingPlanId);
    if (plan.id === status.billingPlanId) return { kind: "disabled", label: "Current plan", note: null };
    if (current && plan.amountInr <= current.amountInr) {
      return { kind: "disabled", label: "Included in your plan", note: `You're on ${current.name}.` };
    }
    return { kind: "pay", upgrade: true, note: "Upgrade — you only pay the pro-rata difference." };
  }
  return { kind: "pay", upgrade: false, note: null };
}

export function PricingPlans() {
  const { data, isLoading, isError } = usePublicPlans();
  const { user } = useAuth();
  const plans = data?.plans ?? [];
  const { data: status } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: !!user,
  });
  const checkout = useRazorpayCheckout({ successRedirect: "/dashboard" });
  const [authPlan, setAuthPlan] = useState<PublicBillingPlan | null>(null);

  const pay = (plan: PublicBillingPlan, upgrade: boolean) => {
    if (checkout.isProcessing) return;
    if (!user) {
      setAuthPlan(plan);
      return;
    }
    void checkout.start(plan, { upgrade });
  };
  const columns = isLoading ? 3 : plans.length;

  return (
    <>
      <div
        className={`grid items-stretch gap-6 ${
          columns >= 3 ? "md:grid-cols-3" : columns === 2 ? "mx-auto max-w-4xl md:grid-cols-2" : "mx-auto max-w-md"
        }`}
        data-testid="pricing-plans"
      >
        {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}
        {!isLoading && plans.length === 0 && (
          <p className="rounded-2xl border border-[#04322E]/10 bg-white p-8 text-center text-sm text-[#04322E]/60">
            {isError ? "Plans couldn't be loaded right now." : "Plans are being updated."} Please try again shortly or{" "}
            <Link href="/contact" className="font-medium text-[#0E8C7F] underline underline-offset-2">
              contact us
            </Link>
            .
          </p>
        )}
        {plans.map((plan, i) => {
          const action = planAction(plan, plans, user ? status : undefined);
          const processing = checkout.processingPlanId === plan.id;
          const buttonClass = `flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${
            plan.featured
              ? accentButton
              : "border border-[#04322E]/15 text-[#04322E] hover:border-[#14B8A6]/50 hover:bg-teal-50"
          }`;
          let cta: React.ReactNode;
          if (action.kind === "link") {
            cta = (
              <Link href={action.href} className={buttonClass} data-testid={`button-plan-${plan.slug}`}>
                {action.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            );
          } else if (action.kind === "disabled") {
            cta = (
              <button type="button" disabled className={buttonClass} data-testid={`button-plan-${plan.slug}`}>
                {action.label}
              </button>
            );
          } else {
            cta = (
              <button
                type="button"
                onClick={() => pay(plan, action.upgrade)}
                disabled={checkout.isProcessing}
                aria-busy={processing}
                className={buttonClass}
                data-testid={`button-plan-${plan.slug}`}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Processing...
                  </>
                ) : (
                  <>
                    Pay Now <ArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            );
          }
          // Secondary action: sales-led plans route to the existing contact flow;
          // the rest link to the existing sign-up (there is no free trial).
          const secondaryClass =
            "mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-[#04322E]/15 text-sm font-semibold text-[#04322E] transition-colors hover:border-[#14B8A6]/50 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:ring-offset-2";
          let secondary: React.ReactNode = null;
          if (SALES_LED_SLUGS.has(plan.slug)) {
            if (!(action.kind === "link" && action.href === "/contact")) {
              secondary = (
                <Link href="/contact" className={secondaryClass} data-testid={`button-plan-secondary-${plan.slug}`}>
                  Contact Sales
                </Link>
              );
            }
          } else if (!user) {
            secondary = (
              <a href="/login?mode=register" className={secondaryClass} data-testid={`button-plan-secondary-${plan.slug}`}>
                Create Account
              </a>
            );
          }
          return (
            <FadeIn key={plan.id} delay={i * 0.08}>
              <div
                className={`relative flex h-full flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 ${
                  plan.featured
                    ? "border-2 border-[#14B8A6] bg-white shadow-2xl shadow-teal-900/10"
                    : "border border-[#04322E]/10 bg-white"
                }`}
                data-testid={`plan-card-${plan.slug}`}
              >
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0B6E66] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="font-heading text-xl font-semibold text-[#04322E]">{plan.name}</h3>
                {plan.tagline && <p className="mt-1 text-sm text-[#04322E]/55">{plan.tagline}</p>}
                <p className="mb-6 mt-5">
                  <span className="text-4xl font-bold text-[#04322E]" data-testid={`plan-price-${plan.slug}`}>
                    {plan.priceLabel}
                  </span>
                  <span className="text-[#04322E]/50"> / month</span>
                </p>
                <div className="mb-8 flex-1">
                  <ul className="space-y-3">
                    {splitFeatures(plan.features).product.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#14B8A6]" aria-hidden />
                        <span className="text-sm text-[#04322E]/75">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {splitFeatures(plan.features).service.length > 0 && (
                    <div className="mt-5 border-t border-[#04322E]/10 pt-4" data-testid={`plan-service-${plan.slug}`}>
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#04322E]/45">
                        Support from our team
                      </p>
                      <ul className="space-y-3">
                        {splitFeatures(plan.features).service.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <Headphones className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#04322E]/40" aria-hidden />
                            <span className="text-sm text-[#04322E]/75">{feature.charAt(0).toUpperCase() + feature.slice(1)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {cta}
                {action.kind === "pay" && (
                  <p className="mt-2 text-center text-xs text-[#04322E]/55" data-testid={`plan-pay-note-${plan.slug}`}>
                    {PAY_NOTE}
                  </p>
                )}
                {action.note && <p className="mt-2 text-center text-xs text-[#04322E]/55">{action.note}</p>}
                {secondary}
              </div>
            </FadeIn>
          );
        })}
      </div>
      <p className="mt-10 text-center font-heading text-base font-semibold text-[#04322E]" data-testid="pricing-trust">
        Trusted by Growing Businesses Across India
      </p>
      <p className="mt-3 text-center text-sm text-[#04322E]/55">
        Secure payments powered by Razorpay. Choose a plan and activate your subscription instantly. WhatsApp
        conversation charges are billed separately by Meta.
      </p>
      <CheckoutAuthDialog plan={authPlan} onOpenChange={(open) => !open && setAuthPlan(null)} />
    </>
  );
}
