import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ArrowRight,
  XCircle,
  Zap,
  MessageCircle,
  ArrowUpRight,
  Download,
  Crown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrialCountdown } from "@/components/trial-countdown";
import { getTrialRemainingMs } from "@/lib/trial-countdown";
import { cn } from "@/lib/utils";
import { calculateProRataUpgrade } from "@shared/upgradePricing";

interface BillingPlan {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  amountInr: number;
  period: string;
  featured: boolean;
  features: string[];
  razorpayEnabled: boolean;
  maxContacts?: number | null;
  maxMessagesPerDay?: number | null;
  maxWhatsappNumbers?: number | null;
  maxTemplates?: number | null;
  maxTeamSeats?: number | null;
}

interface SubscriptionStatus {
  subscriptionStatus: string;
  hasPaid: boolean;
  grantedFreeAccess: boolean;
  trialEndsAt: string | null;
  isActive: boolean;
  trialDays?: number;
  isTrial?: boolean;
  billingPlanId?: string | null;
  subscriptionEndsAt?: string | null;
  plan?: { id: string; name: string; priceLabel: string; slug: string; amountInr?: number } | null;
  trialUsage?: {
    contactCount: number;
    contactLimit: number;
    contactsRemaining: number;
    messagesSentTotal: number;
    messageTotalLimit: number;
    messagesRemainingTotal: number;
  } | null;
  planUsage?: {
    mode: string;
    plan: { id: string; name: string; priceLabel: string } | null;
    contactCount: number;
    contactLimit: number | null;
    contactsRemaining: number | null;
    messagesSentTotal: number;
    messageTotalLimit: number | null;
    messagesRemainingTotal: number | null;
  } | null;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString("en-IN")}`;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Billing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
  });

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: BillingPlan[] }>({
    queryKey: ["/api/subscription/plans"],
  });

  const plans = plansData?.plans ?? [];
  // Upgrade only when the user already has a concrete paid plan.
  // hasPaid without billingPlanId (admin premium / partial activation) must
  // still use the normal subscribe checkout — not /upgrade.
  const isPaidActive =
    !!status?.hasPaid &&
    status.subscriptionStatus === "active" &&
    !status.grantedFreeAccess &&
    !!status?.billingPlanId;
  // Only treat a plan as "current" once payment succeeded (or free access).
  // Abandoned checkouts used to set billingPlanId and lock the card.
  const currentPlan =
    isPaidActive || status?.grantedFreeAccess
      ? plans.find((p) => p.id === status?.billingPlanId) ||
        plans.find((p) => p.id === status?.plan?.id) ||
        null
      : null;
  const currentAmount = currentPlan?.amountInr ?? 0;
  const visiblePlans = plans;
  const eligiblePlans = isPaidActive
    ? plans.filter((p) => p.razorpayEnabled && p.amountInr > currentAmount)
    : plans.filter((p) => p.razorpayEnabled);
  const canUpgrade = isPaidActive && !!currentPlan && eligiblePlans.length > 0;
  const showPlanPicker = !status?.grantedFreeAccess && visiblePlans.length > 0;

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    if (!selectedPlanId && eligiblePlans.length > 0) {
      const featured = eligiblePlans.find((p) => p.featured);
      setSelectedPlanId(featured?.id ?? eligiblePlans[0].id);
    }
  }, [eligiblePlans, selectedPlanId]);

  const selectedPlan = visiblePlans.find((p) => p.id === selectedPlanId) ?? null;
  const upgradeBreakdown =
    isPaidActive && selectedPlan && currentPlan
      ? calculateProRataUpgrade({
          fromPlanAmountInr: currentAmount,
          toPlanAmountInr: selectedPlan.amountInr,
          subscriptionEndsAt: status?.subscriptionEndsAt,
        })
      : null;
  const upgradePayable = upgradeBreakdown?.payableInr ?? 0;
  const canCheckoutSelectedPlan =
    !!selectedPlan &&
    selectedPlan.razorpayEnabled &&
    (!isPaidActive || selectedPlan.amountInr > currentAmount);
  const trialActive =
    status?.isTrial && status.trialEndsAt && getTrialRemainingMs(status.trialEndsAt) > 0;

  const refreshStatus = () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/subscription/payments"],
    });

    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/status"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/payments"],
      });
    }, 1500);
  };

  const handleSubscribe = async () => {
    if (!canCheckoutSelectedPlan || !selectedPlan?.razorpayEnabled) return;

    setIsSubscribing(true);
    try {
      const ready = await loadRazorpayScript();
      if (!ready) {
        toast({
          title: "Error",
          description: "Could not load payment gateway. Please try again.",
          variant: "destructive",
        });
        setIsSubscribing(false);
        return;
      }

      // Difference upgrade only when already on a paid plan; otherwise new subscribe.
      if (isPaidActive && currentPlan) {
        const res = await apiRequest("POST", "/api/subscription/upgrade", {
          planId: selectedPlan.id,
        });
        const data = await res.json();

        const razorpay = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency || "INR",
          order_id: data.orderId,
          name: "ChatBoatAI",
          description: `Upgrade to ${data.toPlan?.name ?? selectedPlan.name} — pay ${formatInr(data.differenceInr)}`,
          theme: { color: "#14205a" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await apiRequest("POST", "/api/subscription/upgrade/confirm", {
                planId: selectedPlan.id,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              toast({
                title: "Plan upgraded",
                description: `You're now on ${data.toPlan?.name ?? selectedPlan.name}.`,
              });
              setSelectedPlanId(null);
              refreshStatus();
            } catch (error: any) {
              toast({
                title: "Upgrade confirmation failed",
                description:
                  error.message?.replace(/^\d+:\s*/, "") ||
                  "Payment received — contact support if your plan didn't update.",
                variant: "destructive",
              });
            } finally {
              setIsSubscribing(false);
            }
          },
          modal: {
            ondismiss: () => setIsSubscribing(false),
          },
        });

        razorpay.on("payment.failed", () => {
          toast({
            title: "Payment failed",
            description: "Your upgrade payment could not be processed. Please try again.",
            variant: "destructive",
          });
          setIsSubscribing(false);
        });

        razorpay.open();
        return;
      }

      const res = await apiRequest("POST", "/api/subscription/create", {
        planId: selectedPlan.id,
      });
      const data = await res.json();

      const razorpay = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "ChatBoatAI",
        description: `${data.plan?.name ?? selectedPlan.name} — ${selectedPlan.priceLabel}/month`,
        theme: { color: "#14205a" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await apiRequest("POST", "/api/subscription/confirm", {
              planId: selectedPlan.id,
              paymentId: response.razorpay_payment_id,
              subscriptionId: response.razorpay_subscription_id,
              signature: response.razorpay_signature,
            });
            toast({
              title: "Payment successful",
              description: `You're now on the ${selectedPlan.name} plan.`,
            });
            refreshStatus();
          } catch (error: any) {
            toast({
              title: "Payment received",
              description:
                error.message?.replace(/^\d+:\s*/, "") ||
                "Activating your plan — refresh in a few seconds if status hasn't updated.",
            });
            refreshStatus();
          } finally {
            setIsSubscribing(false);
          }
        },
        modal: {
          ondismiss: () => setIsSubscribing(false),
        },
      });

      razorpay.on("payment.failed", () => {
        toast({
          title: "Payment failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive",
        });
        setIsSubscribing(false);
      });

      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message?.replace(/^\d+:\s*/, "") || "Failed to start checkout",
        variant: "destructive",
      });
      setIsSubscribing(false);
    }
  };

  const isLoading = statusLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-6xl animate-in fade-in duration-300">
        <div className="page-hero">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72 mt-2.5" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="page-hero">
        <h1 className="page-title">Billing & Subscription</h1>
        <p className="page-subtitle">
          {isPaidActive
            ? "Manage your plan — upgrade anytime and pay only the difference"
            : "Choose a plan that fits your team — checkout securely with Razorpay"}
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#25D366]/8 to-transparent border-b border-[#075E54]/6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#25D366]" />
              <CardTitle className="text-[#075E54]">Current plan</CardTitle>
            </div>
            {status?.isActive ? (
              <Badge className="bg-[#25D366]/15 text-[#075E54] border-[#25D366]/30 hover:bg-[#25D366]/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" /> Inactive
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {status?.grantedFreeAccess && (
            <p className="text-sm text-muted-foreground">
              You have been granted free access by an administrator.
            </p>
          )}
          {isPaidActive && (
            <div className="rounded-xl border border-[#25D366]/30 bg-gradient-to-r from-[#25D366]/10 via-white to-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#075E54]/55">
                    Active subscription
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#075E54]">
                    {(status?.plan ?? currentPlan)?.name ?? "Current Plan"}
                  </p>
                  <p className="text-sm text-[#075E54]/70">
                    {(status?.plan ?? currentPlan)?.priceLabel
                      ? `${(status?.plan ?? currentPlan)!.priceLabel}/month`
                      : "Monthly plan"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1.5 rounded-full border-0 bg-gradient-to-r from-[#128C7E] to-[#25D366] px-3 py-1.5 text-white shadow-md shadow-[#25D366]/30 hover:from-[#0f7a6f] hover:to-[#22c35f]">
                    <Crown className="h-3.5 w-3.5" />
                    Current active plan
                  </Badge>
                  {status?.subscriptionEndsAt && (
                    <Badge variant="outline" className="border-[#075E54]/20 text-[#075E54]/80">
                      Renews {new Date(status.subscriptionEndsAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-[#075E54]/70">
                {canUpgrade
                  ? "Upgrade anytime. Lower-priced plans are disabled for your current subscription."
                  : "You're on the highest available plan right now."}
              </p>
            </div>
          )}
          {status?.subscriptionStatus === "trial" && !status.hasPaid && (
            <div className="flex flex-col gap-2 text-sm rounded-xl bg-amber-50 border border-amber-200/80 px-4 py-3 text-amber-900">
              <div className="flex flex-wrap items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                {trialActive ? (
                  <TrialCountdown
                    endsAt={status.trialEndsAt}
                    prefix="Free trial ends in"
                    className="font-medium"
                  />
                ) : (
                  <span>Your free trial has ended. Choose a plan below to continue.</span>
                )}
              </div>
              {status.isTrial && status.trialUsage && trialActive && (
                <ul className="ml-6 space-y-1 text-xs text-amber-800">
                  <li>
                    Contacts (all numbers): {status.trialUsage.contactCount}/{status.trialUsage.contactLimit} used
                    ({status.trialUsage.contactsRemaining} remaining)
                  </li>
                  <li>
                    Messages (total for trial): {status.trialUsage.messagesSentTotal}/{status.trialUsage.messageTotalLimit} sent
                    ({status.trialUsage.messagesRemainingTotal} remaining)
                  </li>
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showPlanPicker && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[#075E54]">
              {isPaidActive ? "Upgrade your plan" : "Choose your plan"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isPaidActive
                ? "All plans are visible. Your current plan is marked, and lower-priced plans are disabled."
                : "All prices exclusive of GST · Meta conversation charges billed at cost"}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {visiblePlans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isCurrent = plan.id === currentPlan?.id;
              const isLowerTier = isPaidActive && plan.amountInr < currentAmount;
              const isDisabledPlan = isCurrent || isLowerTier;
              const diff = isPaidActive ? plan.amountInr - currentAmount : 0;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    if (!isDisabledPlan) {
                      setSelectedPlanId(plan.id);
                    }
                  }}
                  disabled={isDisabledPlan}
                  className={cn(
                    "relative text-left rounded-2xl border bg-white p-6 transition-all duration-200",
                    "hover:shadow-[0_16px_48px_-20px_rgba(7,94,84,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]",
                    isSelected
                      ? "border-[#25D366] ring-2 ring-[#25D366]/30 shadow-md"
                      : "border-[#075E54]/10",
                    plan.featured && !isSelected && "border-[#25D366]/40",
                    isDisabledPlan && "opacity-60 cursor-not-allowed",
                  )}
                  data-testid={`plan-card-${plan.id}`}
                >
                  {plan.featured && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#25D366] text-white hover:bg-[#25D366]">
                      Most popular
                    </Badge>
                  )}
                  <div className="space-y-4 pt-1">
                    <div>
                      <h3 className="text-xl font-semibold text-[#075E54]">{plan.name}</h3>
                      {isCurrent && (
                        <Badge className="mt-2 inline-flex gap-1 rounded-full border-0 bg-gradient-to-r from-[#128C7E] to-[#25D366] px-2.5 py-1 text-white shadow-md shadow-[#25D366]/30 hover:from-[#128C7E] hover:to-[#25D366]">
                          <Crown className="h-3 w-3" />
                          Current plan
                        </Badge>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-[#075E54]">{plan.priceLabel}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                    {isPaidActive && diff > 0 && (
                      <p className="text-sm font-medium text-[#128C7E]">
                        Upgrade for {formatInr(diff)} today
                      </p>
                    )}
                    {isLowerTier && (
                      <p className="text-sm font-medium text-muted-foreground">
                        Downgrades are disabled for your current subscription.
                      </p>
                    )}
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-[#075E54]/80">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
                            <Check className="h-2.5 w-2.5 text-[#128C7E]" />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {isSelected && !isDisabledPlan && (
                      <p className="text-xs font-medium text-[#128C7E]">Selected</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <Card className="border-[#25D366]/20 bg-gradient-to-b from-[#25D366]/5 to-white">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#075E54]">
                  {selectedPlan
                    ? isPaidActive
                      ? `Upgrade to ${selectedPlan.name} — pay ${formatInr(upgradePayable)}`
                      : `${selectedPlan.name} plan — ${selectedPlan.priceLabel}/month`
                    : "Select a plan to continue"}
                </p>
                {isPaidActive && upgradeBreakdown?.usesProRata && selectedPlan && currentPlan && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedPlan.priceLabel}/month − {formatInr(upgradeBreakdown.remainingCreditInr)} unused
                    credit from {currentPlan.name} ({upgradeBreakdown.daysRemaining} day
                    {upgradeBreakdown.daysRemaining === 1 ? "" : "s"} left)
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isPaidActive
                    ? "Pro-rata upgrade via Razorpay · new 30-day period starts after payment"
                    : "Secure checkout via Razorpay · Cancel anytime"}
                </p>
              </div>
              {selectedPlan?.razorpayEnabled ? (
                <Button
                  onClick={handleSubscribe}
                  disabled={!canCheckoutSelectedPlan || isSubscribing}
                  data-testid="button-subscribe"
                  size="lg"
                  className="w-full sm:w-auto h-12 gap-2 bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] shadow-md shadow-[#25D366]/20"
                >
                  {isPaidActive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isSubscribing
                    ? "Opening Razorpay..."
                    : isPaidActive
                      ? `Upgrade — pay ${formatInr(upgradePayable)}`
                      : `Continue with Razorpay — ${selectedPlan.priceLabel}/mo`}
                  {!isSubscribing && <ArrowRight className="h-4 w-4" />}
                </Button>
              ) : (
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 gap-2 border-[#075E54]/20"
                    data-testid="button-contact-sales"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Talk to sales
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <PaymentHistorySection />
    </div>
  );
}

function PaymentHistorySection() {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { data, isLoading } = useQuery<{
    payments: Array<{
      id: string;
      type: string;
      status: string;
      amountLabel: string;
      method: string | null;
      description: string | null;
      razorpayPaymentId: string | null;
      plan: { name: string; priceLabel: string } | null;
      fromPlan: { name: string } | null;
      createdAt: string | null;
    }>;
  }>({
    queryKey: ["/api/subscription/payments"],
  });

  const payments = data?.payments ?? [];

  const handleDownloadInvoice = async (paymentId: string) => {
    setDownloadingId(paymentId);
    try {
      const res = await fetch(`/api/subscription/payments/${paymentId}/invoice`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to download invoice");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `chatboatai-invoice-${paymentId}.html`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Invoice downloaded",
        description: "Open the file and use Print → Save as PDF if you need a PDF copy.",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Could not download invoice",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#075E54]">Payment history</CardTitle>
        <p className="text-sm text-muted-foreground">
          Subscriptions, upgrades, and renewals — download invoices for successful payments
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No payments yet.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#075E54]/10 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#075E54]">
                    {payment.description ||
                      (payment.type === "upgrade"
                        ? `Upgrade${payment.fromPlan ? ` from ${payment.fromPlan.name}` : ""}${payment.plan ? ` to ${payment.plan.name}` : ""}`
                        : payment.plan
                          ? `${payment.plan.name} ${payment.type}`
                          : payment.type)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {payment.createdAt
                      ? new Date(payment.createdAt).toLocaleString()
                      : "—"}
                    {payment.method ? ` · ${payment.method}` : ""}
                    {payment.razorpayPaymentId
                      ? ` · ${payment.razorpayPaymentId}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <Badge
                    variant={payment.status === "captured" ? "secondary" : "destructive"}
                    className={
                      payment.status === "captured"
                        ? "bg-[#25D366]/15 text-[#075E54] border-[#25D366]/30"
                        : undefined
                    }
                  >
                    {payment.status}
                  </Badge>
                  <span className="font-semibold text-[#075E54]">{payment.amountLabel}</span>
                  {payment.status === "captured" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-9"
                      onClick={() => handleDownloadInvoice(payment.id)}
                      disabled={downloadingId === payment.id}
                      data-testid={`button-download-invoice-${payment.id}`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadingId === payment.id ? "Downloading…" : "Invoice"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
