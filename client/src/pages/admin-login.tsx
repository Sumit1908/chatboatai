import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { SESSION_SUPERSEDED_KEY } from "@/hooks/use-auth";
import { AuthSeo } from "@/components/seo-head";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_SUPERSEDED_KEY)) {
      sessionStorage.removeItem(SESSION_SUPERSEDED_KEY);
      setError("You were signed out because your account was opened on another device.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: username, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "/api/auth/user",
      });
      navigate("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFF] px-4">
      <AuthSeo path="/admin-login" />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,211,238,0.14), transparent 55%)",
        }}
      />
      <Card className="relative w-full max-w-sm border-[#14205a]/10 bg-white shadow-[0_24px_60px_-28px_rgba(20,32,90,0.2)]">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#14205a] text-white">
            <Shield className="h-5 w-5" />
          </div>
          <CardTitle className="text-[#14205a]">Admin access</CardTitle>
          <CardDescription>Restricted — authorized personnel only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-admin-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-admin-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#14205a] hover:bg-[#1a2a6e] text-white"
              disabled={isSubmitting}
              data-testid="button-admin-login"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
