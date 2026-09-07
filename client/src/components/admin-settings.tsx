import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, ShieldCheck, KeyRound } from "lucide-react";

interface GeneralSettings {
  websiteName?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
}

export function AdminSettingsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [general, setGeneral] = useState<GeneralSettings>({ websiteName: "", supportEmail: "", supportPhone: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data } = useQuery<GeneralSettings | null>({
    queryKey: ["/api/admin/website-settings"],
  });

  useEffect(() => {
    if (data) {
      setGeneral({
        websiteName: data.websiteName || "",
        supportEmail: data.supportEmail || "",
        supportPhone: data.supportPhone || "",
      });
    }
  }, [data]);

  const saveGeneralMutation = useMutation({
    mutationFn: async (payload: GeneralSettings) => apiRequest("PUT", "/api/admin/website-settings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/website-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/website-settings"] });
      toast({ title: "Saved", description: "General settings updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save settings", variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your admin password has been updated." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message?.replace(/^\d+:\s*/, "") || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Missing fields", description: "Enter your current and new password.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Confirm password must match the new password.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">General site settings and account security</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">General Settings</CardTitle>
          <CardDescription>Shown on public pages wherever the site name / support contact appears</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Website Name</Label>
              <Input
                value={general.websiteName || ""}
                onChange={(e) => setGeneral((p) => ({ ...p, websiteName: e.target.value }))}
                placeholder="Leave blank to keep current"
                data-testid="input-website-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input
                value={general.supportEmail || ""}
                onChange={(e) => setGeneral((p) => ({ ...p, supportEmail: e.target.value }))}
                placeholder="Leave blank to keep current"
                data-testid="input-support-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Support Phone</Label>
              <Input
                value={general.supportPhone || ""}
                onChange={(e) => setGeneral((p) => ({ ...p, supportPhone: e.target.value }))}
                placeholder="Leave blank to keep current"
                data-testid="input-support-phone"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveGeneralMutation.mutate(general)} disabled={saveGeneralMutation.isPending} data-testid="button-save-general-settings">
              <Save className="h-4 w-4 mr-2" />
              {saveGeneralMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change Admin Password
          </CardTitle>
          <CardDescription>Applies to your currently logged-in admin account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} data-testid="input-current-password" autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="input-new-password" autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">At least 8 characters</p>
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} data-testid="input-confirm-password" autoComplete="new-password" />
          </div>
          <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending} data-testid="button-change-password">
            {changePasswordMutation.isPending ? "Updating…" : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Session Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Only one active session is allowed per account — signing in on another device automatically signs
            this session out. Logging out from the sidebar immediately ends this session everywhere.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
