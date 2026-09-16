import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  // Captured once on first render, not re-derived from useSearch() on every
  // render - the effect below strips the token out of the visible URL, and
  // if this read it from the URL every render it would lose the value the
  // moment that happens.
  const [token] = useState(() => new URLSearchParams(search).get("token") || "");

  useEffect(() => {
    if (!token) return;
    // Reduce how long the raw token is visible in the address bar/browser
    // history while it's still live and unconsumed - the value needed to
    // submit the form is already captured in state above, so the reset
    // flow itself is unaffected. Doesn't touch page-view tracking
    // (client/src/hooks/use-page-tracking.ts / GoogleAnalytics), which
    // reads wouter's location - pathname only, never the query string - so
    // there was never a token there to begin with.
    window.history.replaceState(null, "", window.location.pathname);
    // Intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "This reset link is invalid or has expired. Please request a new one.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,rgba(37,211,102,0.14),transparent_50%),radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(18,140,126,0.1),transparent_50%),linear-gradient(135deg,rgba(247,251,248,0.95),rgba(255,255,255,0.9))]">
      <div className="w-full max-w-[420px]">
        {!success && (
          <Link href="/login">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 gap-1.5 text-[#075E54]/70 hover:text-[#075E54] hover:bg-[#25D366]/10"
              data-testid="button-back-login"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to log in
            </Button>
          </Link>
        )}

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25">
            <FaWhatsapp className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-xl font-bold text-[#075E54]">ChatBoatAI</h1>
        </div>

        <Card className="p-8">
          {success ? (
            <CardContent className="p-0 flex flex-col items-center gap-3 text-center py-2" data-testid="text-reset-success">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="font-heading text-lg font-bold text-[#075E54]">Password updated</h2>
              <p className="text-sm text-[#075E54]/70">
                Your password has been reset. For your security, you've been signed out everywhere and need to log in again.
              </p>
              <Button
                type="button"
                className="w-full h-12 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] mt-2"
                onClick={() => navigate("/login")}
                data-testid="button-go-to-login"
              >
                Go to log in
              </Button>
            </CardContent>
          ) : !token ? (
            <CardContent className="p-0 text-center py-2" data-testid="text-reset-missing-token">
              <p className="text-sm text-[#075E54]/70 mb-4">
                This reset link is missing or invalid. Please request a new one.
              </p>
              <Link href="/forgot-password">
                <Button type="button" className="w-full h-12 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a]">
                  Request a new link
                </Button>
              </Link>
            </CardContent>
          ) : (
            <>
              <CardHeader className="p-0 text-center mb-6">
                <h2 className="font-heading text-xl font-bold text-[#075E54]">Set a new password</h2>
                <p className="mt-1 text-sm text-[#075E54]/60">Choose a new password for your account.</p>
              </CardHeader>

              <CardContent className="p-0">
                {error && (
                  <Alert variant="destructive" className="mb-4 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-medium text-[#075E54]/70">
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        data-testid="input-new-password"
                        className="h-11 rounded-xl border-[#075E54]/15 bg-white/60 pr-10 focus:border-[#25D366] focus:ring-[#25D366]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#075E54]/40 hover:text-[#075E54]/70 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#075E54]/40 mt-1">At least 8 characters</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium text-[#075E54]/70">
                      Confirm new password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="input-confirm-password"
                      className="h-11 rounded-xl border-[#075E54]/15 bg-white/60 focus:border-[#25D366] focus:ring-[#25D366]/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a]"
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? "Updating…" : "Reset password"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
