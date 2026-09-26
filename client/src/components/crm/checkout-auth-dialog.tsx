import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { appHref } from "@/hooks/use-razorpay-checkout";
import type { PublicBillingPlan } from "@/hooks/use-public-plans";
import { accentButton } from "./brand";

/**
 * "Pay Now" for a signed-out visitor: a subscription has to belong to an
 * account, so sign up / log in here (same /api/register and /api/login as the
 * login page), then continue straight into Razorpay checkout for the chosen
 * plan in the app (Billing opens the payment window on arrival).
 */
export function CheckoutAuthDialog({
  plan,
  onOpenChange,
}: {
  plan: PublicBillingPlan | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (plan) setError("");
  }, [plan]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(mode === "login" ? "/api/login" : "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(mode === "login" ? { email, password } : { email, password, firstName, lastName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      // A full navigation (not a cache update): the signed-in app takes over
      // from the marketing site, and Billing opens Razorpay for this plan.
      window.location.href =
        data.user?.role === "super_admin"
          ? appHref("/admin")
          : appHref(`/billing?plan=${encodeURIComponent(plan.slug)}&checkout=1`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const field = "h-11 rounded-xl border-[#04322E]/15 bg-white focus-visible:ring-[#14B8A6]/40";

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !submitting && onOpenChange(open)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md" data-testid="dialog-checkout-auth">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-[#04322E]">
            {plan ? `Pay for ${plan.name} — ${plan.priceLabel}/month` : "Pay now"}
          </DialogTitle>
          <DialogDescription>
            {mode === "register"
              ? "Create your account. Secure Razorpay checkout opens right after."
              : "Log in to your account. Secure Razorpay checkout opens right after."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#04322E]/5 p-1" role="tablist">
          {(["register", "login"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === m ? "bg-white text-[#04322E] shadow-sm" : "text-[#04322E]/60 hover:text-[#04322E]"
              }`}
              data-testid={`checkout-auth-tab-${m}`}
            >
              {m === "register" ? "New account" : "I have an account"}
            </button>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="checkout-first-name" className="text-xs text-[#04322E]/70">First name</Label>
                <Input id="checkout-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} autoComplete="given-name" data-testid="checkout-input-firstname" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkout-last-name" className="text-xs text-[#04322E]/70">Last name</Label>
                <Input id="checkout-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={field} autoComplete="family-name" data-testid="checkout-input-lastname" />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-email" className="text-xs text-[#04322E]/70">Email address</Label>
            <Input id="checkout-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={field} autoComplete="email" data-testid="checkout-input-email" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="checkout-password" className="text-xs text-[#04322E]/70">Password</Label>
              {mode === "login" && (
                <Link href="/forgot-password" className="text-xs font-medium text-[#0E8C7F] hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Input
                id="checkout-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={mode === "register" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} pr-10`}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                data-testid="checkout-input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04322E]/40 hover:text-[#04322E]/70"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "register" && <p className="text-[11px] text-[#04322E]/45">At least 8 characters</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${accentButton}`}
            data-testid="checkout-auth-submit"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Processing...
              </>
            ) : (
              <>
                Continue to payment <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </form>
        <p className="text-center text-[11px] text-[#04322E]/45">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
