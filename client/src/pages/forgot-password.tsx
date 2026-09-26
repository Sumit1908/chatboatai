import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Always the same generic message on a successful request, regardless of
  // whether the email is registered — see server/passwordReset.ts.
  const [sentMessage, setSentMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Only a rate-limit / network-level failure reaches here — the
        // route itself always responds 200 with the generic message.
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }
      setSentMessage(data.message || "If an account exists for this email, we have sent password reset instructions.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,rgba(37,211,102,0.14),transparent_50%),radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(18,140,126,0.1),transparent_50%),linear-gradient(135deg,rgba(247,251,248,0.95),rgba(255,255,255,0.9))]">
      <div className="w-full max-w-[420px]">
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

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25">
            <FaWhatsapp className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-xl font-bold text-[#075E54]">ChatBoatAI</h1>
        </div>

        <Card className="p-8">
          <CardHeader className="p-0 text-center mb-6">
            <h2 className="font-heading text-xl font-bold text-[#075E54]">Forgot your password?</h2>
            <p className="mt-1 text-sm text-[#075E54]/60">
              Enter your account email and we'll send you a link to reset it.
            </p>
          </CardHeader>

          <CardContent className="p-0">
            {error && (
              <Alert variant="destructive" className="mb-4 rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {sentMessage ? (
              <div className="flex flex-col items-center gap-3 text-center py-2" data-testid="text-forgot-password-sent">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                  <MailCheck className="h-6 w-6" />
                </div>
                <p className="text-sm text-[#075E54]/80">{sentMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[#075E54]/70">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email"
                    className="h-11 rounded-xl border-[#075E54]/15 bg-white/60 focus:border-[#25D366] focus:ring-[#25D366]/20"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a]"
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  {isSubmitting ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
