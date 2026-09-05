import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, AlertTriangle, ExternalLink, HelpCircle, ChevronDown, ChevronUp, Copy, Plus, Smartphone, Trash2, MessageSquare, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton, PageSkeleton, CardSkeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ApiSettings, WhatsAppAccount } from "@shared/schema";

export default function Settings() {
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showManualToken, setShowManualToken] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const { toast } = useToast();

  // Manual account form state
  const [manualAccount, setManualAccount] = useState({
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    name: "",
  });

  const { data: settings, isLoading } = useQuery<ApiSettings>({
    queryKey: ["/api/settings"],
  });

  // Fetch connected WhatsApp accounts
  const { data: accountsData } = useQuery<{ accounts: WhatsAppAccount[]; activeAccountId: string }>({
    queryKey: ["/api/accounts"],
  });

  const accounts = accountsData?.accounts || [];
  const activeAccount = accounts.find(a => a.id === accountsData?.activeAccountId);

  const [formData, setFormData] = useState<Partial<ApiSettings>>({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    webhookVerifyToken: "",
    apiVersion: "v18.0",
  });

  useEffect(() => {
    if (!settings) return;
    setFormData({
      accessToken: settings.accessToken || "",
      phoneNumberId: settings.phoneNumberId || "",
      businessAccountId: settings.businessAccountId || "",
      webhookVerifyToken: settings.webhookVerifyToken || "",
      apiVersion: settings.apiVersion || "v18.0",
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ApiSettings>) => {
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your API configuration has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      let res;
      if (activeAccount) {
        res = await apiRequest("POST", `/api/whatsapp-accounts/${activeAccount.id}/test`);
      } else {
        res = await apiRequest("POST", "/api/settings/test");
      }
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to test connection. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const addManualAccountMutation = useMutation({
    mutationFn: async (data: typeof manualAccount) => {
      return apiRequest("POST", "/api/whatsapp-accounts/manual", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Account Connected",
        description: data.message || "WhatsApp account connected successfully!",
      });
      // Reset form
      setManualAccount({
        phoneNumberId: "",
        businessAccountId: "",
        accessToken: "",
        name: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect WhatsApp account. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof ApiSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Configure your Meta WhatsApp Business API connection
        </p>
      </div>

      {/* Setup Guide */}
      <Collapsible open={showGuide} onOpenChange={setShowGuide}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover-elevate">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base font-semibold">Setup Guide</CardTitle>
                    <CardDescription>
                      Step-by-step instructions to connect WhatsApp Business API
                    </CardDescription>
                  </div>
                </div>
                {showGuide ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-6">
              <div className="space-y-4">
                <SetupStep
                  step={1}
                  title="Create a Meta Developer Account"
                  description="Go to developers.facebook.com and create a developer account if you don't have one."
                  link="https://developers.facebook.com/"
                />
                <SetupStep
                  step={2}
                  title="Create a Business App"
                  description="Create a new app and select 'Business' as the app type. This will give you access to WhatsApp Business API."
                  link="https://developers.facebook.com/apps/"
                />
                <SetupStep
                  step={3}
                  title="Add WhatsApp Product"
                  description="In your app dashboard, find 'WhatsApp' in the products list and click 'Set Up'. Follow the prompts to link your business account."
                />
                <SetupStep
                  step={4}
                  title="Get Your Credentials"
                  description="Navigate to WhatsApp > API Setup. Here you'll find your Phone Number ID, Business Account ID, and can generate a permanent Access Token."
                />
                <SetupStep
                  step={5}
                  title="Configure Webhook"
                  description="In WhatsApp > Configuration, add the webhook URL shown below and enter your custom verify token. Subscribe to 'messages' events."
                />
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Helpful Resources</p>
                <div className="space-y-2">
                  <ResourceLink
                    text="WhatsApp Cloud API Documentation"
                    url="https://developers.facebook.com/docs/whatsapp/cloud-api"
                  />
                  <ResourceLink
                    text="Get Permanent Access Token"
                    url="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#1--acquire-an-access-token-using-a-system-user-or-facebook-login"
                  />
                  <ResourceLink
                    text="Message Template Guidelines"
                    url="https://developers.facebook.com/docs/whatsapp/message-templates/guidelines"
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Connected WhatsApp Accounts */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-semibold">Connected WhatsApp Numbers</CardTitle>
                  <CardDescription>
                    Your connected WhatsApp Business accounts
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddAccount(!showAddAccount)}
                data-testid="button-toggle-add-account"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    account.id === accountsData?.activeAccountId ? "border-primary bg-primary/5" : ""
                  }`}
                  data-testid={`connected-account-${account.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {account.name || "WhatsApp Business"}
                        {account.id === accountsData?.activeAccountId && (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{account.phoneNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.status === "connected" ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {account.status === "pending" ? "Pending" : "Disconnected"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add WhatsApp Number Manually - show if no accounts or toggled */}
      {(accounts.length === 0 || showAddAccount) && (
        <AddNumberSection
          manualAccount={manualAccount}
          setManualAccount={setManualAccount}
          showManualToken={showManualToken}
          setShowManualToken={setShowManualToken}
          addManualAccountMutation={addManualAccountMutation}
        />
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Connection Status</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !activeAccount}
              data-testid="button-test-connection"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${testMutation.isPending ? "animate-spin" : ""}`} />
              Test Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <StatusIndicator status={activeAccount?.status === "connected" ? "connected" : "disconnected"} />
            <div className="flex-1">
              <p className="font-medium">
                {activeAccount?.status === "connected" ? "Connected to Meta API" : "Not Connected"}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeAccount 
                  ? `Active account: ${activeAccount.name || activeAccount.phoneNumber}`
                  : "Add a WhatsApp Business account to get started"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">API Configuration</CardTitle>
          <CardDescription>
            Enter your Meta WhatsApp Business API credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <div className="relative">
              <Input
                id="accessToken"
                name="convora-api-access-token"
                type={showToken ? "text" : "password"}
                value={formData.accessToken}
                onChange={(e) => handleInputChange("accessToken", e.target.value)}
                placeholder="Enter your permanent access token"
                className="pr-10 font-mono text-sm"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore
                data-testid="input-access-token"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showToken ? "Hide access token" : "Show access token"}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a permanent token from Meta Business Suite
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                value={formData.phoneNumberId}
                onChange={(e) => handleInputChange("phoneNumberId", e.target.value)}
                placeholder="e.g., 123456789012345"
                className="font-mono text-sm"
                data-testid="input-phone-number-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessAccountId">Business Account ID</Label>
              <Input
                id="businessAccountId"
                name="convora-api-waba-id"
                value={formData.businessAccountId}
                onChange={(e) => handleInputChange("businessAccountId", e.target.value)}
                placeholder="e.g., 987654321098765"
                className="font-mono text-sm"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-testid="input-business-account-id"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookVerifyToken">Webhook Verify Token</Label>
            <Input
              id="webhookVerifyToken"
              value={formData.webhookVerifyToken}
              onChange={(e) => handleInputChange("webhookVerifyToken", e.target.value)}
              placeholder="Your custom verification token"
              className="font-mono text-sm"
              data-testid="input-webhook-verify-token"
            />
            <p className="text-xs text-muted-foreground">
              A custom string to verify webhook requests from Meta
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiVersion">API Version</Label>
            <Input
              id="apiVersion"
              value={formData.apiVersion}
              onChange={(e) => handleInputChange("apiVersion", e.target.value)}
              placeholder="v18.0"
              className="font-mono text-sm max-w-32"
              data-testid="input-api-version"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setFormData(settings || {})}
            >
              Reset
            </Button>
            <Button 
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Webhook Configuration</CardTitle>
          <CardDescription>
            Configure webhooks to receive real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={`${window.location.origin}/api/webhook`}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/webhook`);
                  toast({ title: "Copied to clipboard" });
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add this URL in your Meta App Dashboard under WhatsApp &gt; Configuration &gt; Webhook URL
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                data-testid="button-subscribe-webhooks"
                onClick={async () => {
                  try {
                    const res = await apiRequest("POST", "/api/webhook/subscribe");
                    const data = await res.json();
                    if (!res.ok) {
                      toast({ title: "Setup Issue", description: data.error || "Failed to configure webhooks", variant: "destructive" });
                      return;
                    }
                    if (data.partialFailure) {
                      toast({ title: "Partially Configured", description: data.message, variant: "destructive" });
                    } else {
                      toast({ title: "Webhook Configured", description: data.message });
                    }
                  } catch (err: any) {
                    toast({ title: "Setup Failed", description: err.message || "Could not configure webhook", variant: "destructive" });
                  }
                }}
              >
                Configure Webhooks Automatically
              </Button>
              <p className="text-xs text-muted-foreground">
                Registers your webhook URL with Meta and subscribes to incoming messages
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">Subscribe to Events</p>
            <div className="space-y-3">
              <WebhookToggle
                label="Message Status Updates"
                description="Receive delivery, read, and failure notifications"
                defaultChecked
              />
              <WebhookToggle
                label="Template Status Updates"
                description="Receive approval, rejection, and quality changes"
                defaultChecked
              />
              <WebhookToggle
                label="Account Updates"
                description="Receive quality rating and limit changes"
                defaultChecked
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members / Account Sharing */}
      <TeamMembersSection />

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Rate Limits</CardTitle>
          <CardDescription>
            Current API rate limits and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Messages per second</p>
                <p className="text-sm text-muted-foreground">Current tier limit</p>
              </div>
              <Badge variant="secondary" className="font-mono">80/sec</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Messages per 24 hours</p>
                <p className="text-sm text-muted-foreground">Based on quality tier</p>
              </div>
              <Badge variant="secondary" className="font-mono">100,000</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Template submissions</p>
                <p className="text-sm text-muted-foreground">Per day</p>
              </div>
              <Badge variant="secondary" className="font-mono">100/day</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddNumberSection({
  manualAccount,
  setManualAccount,
  showManualToken,
  setShowManualToken,
  addManualAccountMutation,
}: {
  manualAccount: { phoneNumberId: string; businessAccountId: string; accessToken: string; name: string };
  setManualAccount: (fn: (prev: any) => any) => void;
  showManualToken: boolean;
  setShowManualToken: (v: boolean) => void;
  addManualAccountMutation: any;
}) {
  const [detectedNumbers, setDetectedNumbers] = useState<any[]>([]);
  const [detectLoading, setDetectLoading] = useState(false);
  const { toast } = useToast();

  const handleDetectNumbers = async () => {
    if (!manualAccount.businessAccountId || !manualAccount.accessToken) {
      toast({ title: "Missing info", description: "Enter your WABA ID and Access Token first, then click Detect.", variant: "destructive" });
      return;
    }
    setDetectLoading(true);
    try {
      const res = await apiRequest("POST", "/api/whatsapp-accounts/detect-numbers", {
        businessAccountId: manualAccount.businessAccountId,
        accessToken: manualAccount.accessToken,
      });
      const data = await res.json();
      setDetectedNumbers(data.phoneNumbers || []);
      if ((data.phoneNumbers || []).length === 0) {
        toast({ title: "No numbers found", description: "No phone numbers were found for this WABA. Check your credentials." });
      } else {
        toast({ title: `Found ${data.phoneNumbers.length} number(s)`, description: "Select a number below to auto-fill." });
      }
    } catch (err: any) {
      toast({ title: "Detection failed", description: "Could not fetch numbers. Check your WABA ID and token.", variant: "destructive" });
    } finally {
      setDetectLoading(false);
    }
  };

  const selectNumber = (pn: any) => {
    setManualAccount((prev: any) => ({
      ...prev,
      phoneNumberId: pn.id,
      name: pn.verifiedName || prev.name || "",
    }));
    toast({ title: "Number selected", description: `${pn.displayPhoneNumber} (${pn.verifiedName || "Unknown"}) selected.` });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base font-semibold">Add WhatsApp Number</CardTitle>
            <CardDescription>
              Enter your WABA ID and Access Token to auto-detect numbers, or fill in all fields manually
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="manual-waba-id">WABA ID (Business Account ID)</Label>
          <Input
            id="manual-waba-id"
            name="convora-manual-waba-id"
            value={manualAccount.businessAccountId}
            onChange={(e) => setManualAccount((prev: any) => ({ ...prev, businessAccountId: e.target.value }))}
            placeholder="e.g., 987654321098765"
            className="font-mono text-sm"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore
            data-testid="input-manual-waba-id"
          />
          <p className="text-xs text-muted-foreground">
            WhatsApp Business Account ID from Meta Business Suite
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-access-token">Permanent Access Token</Label>
          <div className="relative">
            <Input
              id="manual-access-token"
              name="convora-manual-access-token"
              type={showManualToken ? "text" : "password"}
              value={manualAccount.accessToken}
              onChange={(e) => setManualAccount((prev: any) => ({ ...prev, accessToken: e.target.value }))}
              placeholder="Enter your permanent access token"
              className="pr-10 font-mono text-sm"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore
              data-testid="input-manual-access-token"
            />
            <button
              type="button"
              onClick={() => setShowManualToken(!showManualToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-manual-token"
              aria-label={showManualToken ? "Hide access token" : "Show access token"}
            >
              {showManualToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate a permanent System User token from Meta Business Settings
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleDetectNumbers}
          disabled={detectLoading || !manualAccount.businessAccountId || !manualAccount.accessToken}
          data-testid="button-detect-numbers"
        >
          {detectLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Detecting Numbers...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Detect Phone Numbers
            </>
          )}
        </Button>

        {detectedNumbers.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
            <p className="text-sm font-medium">Detected Numbers</p>
            {detectedNumbers.map((pn: any) => (
              <button
                key={pn.id}
                onClick={() => selectNumber(pn)}
                className={`w-full text-left p-2 rounded-md border transition-colors ${
                  manualAccount.phoneNumberId === pn.id ? "border-primary bg-primary/5" : "hover-elevate"
                }`}
                data-testid={`detected-number-${pn.id}`}
              >
                <p className="text-sm font-medium">{pn.displayPhoneNumber}</p>
                <p className="text-xs text-muted-foreground">{pn.verifiedName} · ID: {pn.id}</p>
              </button>
            ))}
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="manual-phone-number-id">Phone Number ID</Label>
          <Input
            id="manual-phone-number-id"
            value={manualAccount.phoneNumberId}
            onChange={(e) => setManualAccount((prev: any) => ({ ...prev, phoneNumberId: e.target.value }))}
            placeholder="e.g., 123456789012345 (click a detected number above, or type it here)"
            className="font-mono text-sm"
            data-testid="input-manual-phone-number-id"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-name">Account Name (Optional)</Label>
          <Input
            id="manual-name"
            value={manualAccount.name}
            onChange={(e) => setManualAccount((prev: any) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., My Business WhatsApp"
            className="text-sm"
            data-testid="input-manual-name"
          />
        </div>

        <Button
          onClick={() => addManualAccountMutation.mutate(manualAccount)}
          disabled={addManualAccountMutation.isPending || !manualAccount.phoneNumberId || !manualAccount.businessAccountId || !manualAccount.accessToken}
          className="w-full"
          data-testid="button-add-manual-account"
        >
          {addManualAccountMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Verifying & Connecting...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add WhatsApp Number
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamMembersSection() {
  const [inviteEmail, setInviteEmail] = useState("");
  const { toast } = useToast();

  const { data: members = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/team-members"],
  });

  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("POST", "/api/team-members", { email, role: "member" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      setInviteEmail("");
      toast({ title: "Team member invited", description: "They can now access your account when they log in." });
    },
    onError: (err: any) => {
      let msg = "Failed to add team member";
      try { msg = JSON.parse(err.message)?.error || msg; } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/team-members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Team member removed" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Team Members</CardTitle>
        <CardDescription>
          Share access to your account with team members by entering their email address. They will get full access to this WhatsApp account when they log in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter team member's email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              data-testid="input-team-email"
            />
            <Button
              onClick={() => {
                if (inviteEmail.trim()) addMemberMutation.mutate(inviteEmail.trim());
              }}
              disabled={!inviteEmail.trim() || addMemberMutation.isPending}
              data-testid="button-add-team-member"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No team members added yet. Add members by email to share access to your account.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`team-member-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {member.memberEmail?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.memberEmail}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {member.role || "member"}
                        </Badge>
                        <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-xs">
                          {member.status === "active" ? "Active" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMemberMutation.mutate(member.id)}
                    data-testid={`button-remove-member-${member.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusIndicatorProps {
  status: "connected" | "disconnected" | "error";
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = {
    connected: { 
      icon: CheckCircle, 
      color: "text-green-500", 
      bg: "bg-green-500/10",
      label: "Connected" 
    },
    disconnected: { 
      icon: XCircle, 
      color: "text-muted-foreground", 
      bg: "bg-muted",
      label: "Disconnected" 
    },
    error: { 
      icon: AlertTriangle, 
      color: "text-red-500", 
      bg: "bg-red-500/10",
      label: "Error" 
    },
  };

  const { icon: Icon, color, bg } = config[status];

  return (
    <div className={`p-3 rounded-lg ${bg}`}>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
  );
}

interface WebhookToggleProps {
  label: string;
  description: string;
  defaultChecked?: boolean;
}

function WebhookToggle({ label, description, defaultChecked }: WebhookToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <PageSkeleton>
      <CardSkeleton lines={2} />
      <div className="rounded-2xl border border-white/60 bg-white/80 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#075E54]/6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </PageSkeleton>
  );
}

interface SetupStepProps {
  step: number;
  title: string;
  description: string;
  link?: string;
}

function SetupStep({ step, title, description, link }: SetupStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
        {step}
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Open Link
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

interface ResourceLinkProps {
  text: string;
  url: string;
}

function ResourceLink({ text, url }: ResourceLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary hover:underline flex items-center gap-1"
    >
      <ExternalLink className="h-3 w-3" />
      {text}
    </a>
  );
}
