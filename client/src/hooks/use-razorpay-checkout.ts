import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type CheckoutPlan = { id: string; name: string; priceLabel: string };

function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString("en-IN")}`;
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Full URL for an app page - the app lives on app.<domain> once the host split is on. */
export function appHref(path: string): string {
  const primaryDomain = import.meta.env.VITE_PRIMARY_DOMAIN as string | undefined;
  if (primaryDomain && window.location.hostname !== `app.${primaryDomain}`) {
    return `https://app.${primaryDomain}${path}`;
  }
  return path;
}

const cleanError = (error: any, fallback: string) => error?.message?.replace(/^\d+:\s*/, "") || fallback;

/**
 * The one Razorpay checkout used by Billing and the pricing cards.
 *
 * Only the plan id is sent: the server looks up the price from the plan
 * configuration, creates the subscription (or the pro-rata upgrade order),
 * and on confirm verifies Razorpay's signature and reads the plan from the
 * Razorpay record itself before activating anything.
 */
export function useRazorpayCheckout({
  onSuccess,
  successRedirect,
}: {
  onSuccess?: () => void;
  /** App path to open after a successful payment (e.g. "/dashboard"). */
  successRedirect?: string;
} = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  // A ref, not state: two fast clicks both run before a re-render.
  const busy = useRef(false);

  const finish = useCallback(() => {
    busy.current = false;
    setProcessingPlanId(null);
  }, []);

  const refreshStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/payments"] });
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }, 1500);
  }, [queryClient]);

  const succeeded = useCallback(() => {
    refreshStatus();
    onSuccess?.();
    if (successRedirect) {
      // Give the toast a moment, then land on the dashboard with fresh data.
      setTimeout(() => {
        window.location.href = appHref(successRedirect);
      }, 1200);
    }
  }, [refreshStatus, onSuccess, successRedirect]);

  const start = useCallback(
    async (plan: CheckoutPlan, { upgrade = false }: { upgrade?: boolean } = {}) => {
      if (busy.current) return;
      busy.current = true;
      setProcessingPlanId(plan.id);
      let failed = false;
      const onFailed = () => {
        failed = true;
        toast({
          title: "Payment failed",
          description: "Your payment could not be processed and your plan was not changed. You can try again.",
          variant: "destructive",
        });
      };
      const onDismiss = () => {
        if (!failed) {
          toast({
            title: "Payment cancelled",
            description: "You haven't been charged and your plan was not changed. You can try again anytime.",
          });
        }
        finish();
      };

      try {
        const ready = await loadRazorpayScript();
        if (!ready) {
          toast({
            title: "Payment unavailable",
            description: "Could not load the Razorpay payment window. Check your connection and try again.",
            variant: "destructive",
          });
          finish();
          return;
        }

        if (upgrade) {
          const res = await apiRequest("POST", "/api/subscription/upgrade", { planId: plan.id });
          const data = await res.json();
          const razorpay = new window.Razorpay({
            key: data.keyId,
            amount: data.amount,
            currency: data.currency || "INR",
            order_id: data.orderId,
            name: "ChatBoatAI",
            description: `Upgrade to ${data.toPlan?.name ?? plan.name} — pay ${formatInr(data.differenceInr)}`,
            theme: { color: "#14205a" },
            handler: async (response: {
              razorpay_order_id: string;
              razorpay_payment_id: string;
              razorpay_signature: string;
            }) => {
              try {
                await apiRequest("POST", "/api/subscription/upgrade/confirm", {
                  planId: plan.id,
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                });
                toast({ title: "Plan upgraded", description: `You're now on ${data.toPlan?.name ?? plan.name}.` });
                succeeded();
              } catch (error: any) {
                toast({
                  title: "Upgrade confirmation failed",
                  description: cleanError(error, "Payment received — contact support if your plan didn't update."),
                  variant: "destructive",
                });
              } finally {
                finish();
              }
            },
            modal: { ondismiss: onDismiss },
          });
          razorpay.on("payment.failed", onFailed);
          razorpay.open();
          return;
        }

        const res = await apiRequest("POST", "/api/subscription/create", { planId: plan.id });
        const data = await res.json();
        const razorpay = new window.Razorpay({
          key: data.keyId,
          subscription_id: data.subscriptionId,
          name: "ChatBoatAI",
          description: `${data.plan?.name ?? plan.name} — ${data.plan?.priceLabel ?? plan.priceLabel}/month`,
          theme: { color: "#14205a" },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_subscription_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await apiRequest("POST", "/api/subscription/confirm", {
                planId: plan.id,
                paymentId: response.razorpay_payment_id,
                subscriptionId: response.razorpay_subscription_id,
                signature: response.razorpay_signature,
              });
              toast({ title: "Payment successful", description: `Your ${plan.name} plan is now active.` });
              succeeded();
            } catch (error: any) {
              toast({
                title: "Payment received",
                description: cleanError(error, "Activating your plan — refresh in a few seconds if status hasn't updated."),
              });
              refreshStatus();
            } finally {
              finish();
            }
          },
          modal: { ondismiss: onDismiss },
        });
        razorpay.on("payment.failed", onFailed);
        razorpay.open();
      } catch (error: any) {
        toast({
          title: "Couldn't start payment",
          description: cleanError(error, "Failed to start checkout. Please try again."),
          variant: "destructive",
        });
        finish();
      }
    },
    [toast, finish, succeeded, refreshStatus],
  );

  return { start, processingPlanId, isProcessing: processingPlanId !== null };
}
