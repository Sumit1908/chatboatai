import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MailWarning } from "lucide-react";

interface SubscriptionStatus {
  emailVerified: boolean;
}

// Handles the redirect back from clicking the verification link in email
// (?verify=success|invalid|error|missing-token), and shows a persistent
// banner with a resend option until the address is actually verified.
export function EmailVerifyBanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get("verify");
    if (!verify) return;

    if (verify === "success") {
      toast({ title: "Email verified", description: "Your email address has been verified." });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    } else if (verify === "invalid" || verify === "missing-token") {
      toast({ title: "Verification link invalid", description: "Please request a new verification email.", variant: "destructive" });
    } else if (verify === "error") {
      toast({ title: "Verification failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }

    params.delete("verify");
    const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
    window.history.replaceState({}, "", newUrl);
  }, []);

  const resend = async () => {
    try {
      const res = await apiRequest("POST", "/api/resend-verification");
      const data = await res.json();
      toast({ title: "Sent", description: data.message || "Verification email sent" });
    } catch {
      toast({ title: "Error", description: "Failed to resend verification email", variant: "destructive" });
    }
  };

  if (!status || status.emailVerified) return null;

  return (
    <Alert className="rounded-none border-x-0 border-t-0 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MailWarning className="h-4 w-4 text-yellow-600" />
        <AlertDescription>
          Please verify your email address to send messages.
        </AlertDescription>
      </div>
      <Button variant="outline" size="sm" onClick={resend} data-testid="button-resend-verification">
        Resend Email
      </Button>
    </Alert>
  );
}
