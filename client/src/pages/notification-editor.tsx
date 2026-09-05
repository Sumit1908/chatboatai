import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Clock, Users, MessageSquare, Zap, AlertCircle, Check, Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Template, ContactList, Notification, WhatsAppAccount } from "@shared/schema";

function isConnectedAccount(account: WhatsAppAccount): boolean {
  const status = (account.status || "").toLowerCase();
  if (status && status !== "connected") return false;
  return !!(account.accessToken && account.phoneNumberId);
}

export default function NotificationEditor() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/notifications/:id/edit");
  const isEdit = !!params?.id;
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [notificationType, setNotificationType] = useState<"bulk" | "transactional">("bulk");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [headerMediaFilename, setHeaderMediaFilename] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accountsData } = useQuery<{ accounts: WhatsAppAccount[] }>({
    queryKey: ["/api/accounts"],
  });
  const hasConnectedMeta = (accountsData?.accounts ?? []).some(isConnectedAccount);

  useEffect(() => {
    if (isEdit) return;
    if (accountsData && !hasConnectedMeta) {
      toast({
        title: "Connect WhatsApp first",
        description: "Connect a WhatsApp Business number (Meta API) before creating notifications.",
        variant: "destructive",
      });
      navigate("/notifications");
    }
  }, [accountsData, hasConnectedMeta, isEdit, navigate, toast]);

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: lists = [] } = useQuery<ContactList[]>({
    queryKey: ["/api/lists"],
  });

  const { data: notification } = useQuery<Notification>({
    queryKey: ["/api/notifications", params?.id],
    enabled: isEdit,
  });

  useEffect(() => {
    if (notification) {
      setName(notification.name);
      setSelectedTemplateId(notification.templateId || "");
      setSelectedListIds(notification.listIds || []);
      setHeaderMediaUrl(notification.headerMediaUrl || "");
      if (notification.scheduledAt) {
        setScheduledAt(new Date(notification.scheduledAt).toISOString().slice(0, 16));
      }
    }
  }, [notification]);

  const approvedTemplates = templates.filter((t) => t.status === "APPROVED");
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const selectedTemplateComponents = (selectedTemplate?.components as any[]) || [];
  const selectedTemplateHeader = selectedTemplateComponents.find((c: any) => c.type === "HEADER");
  const hasMediaHeader = selectedTemplateHeader && ["IMAGE", "VIDEO", "DOCUMENT"].includes(selectedTemplateHeader.format || "");
  const templateMediaUrl = selectedTemplateHeader?.mediaUrl || "";
  // A media header can always be swapped out per-send - reusing the
  // template's original sample isn't required, and doing a fresh upload for
  // each campaign is the more reliable option (it doesn't depend on Meta's
  // template-preview CDN link, which is short-lived, or on the original file
  // still existing on disk after a redeploy).
  const needsMediaUrl = hasMediaHeader && !headerMediaUrl && !templateMediaUrl;
  const headerMediaType = selectedTemplateHeader?.format === "IMAGE" ? "image" :
    selectedTemplateHeader?.format === "VIDEO" ? "video" : "document";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes: Record<string, string[]> = {
      image: ["image/jpeg", "image/png", "image/webp"],
      video: ["video/mp4", "video/quicktime"],
      document: ["application/pdf"],
    };
    if (!allowedTypes[headerMediaType].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload a valid ${headerMediaType} file.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setHeaderMediaUrl(data.url);
      setHeaderMediaFilename(data.filename);
      toast({ title: "File uploaded", description: "Your media file has been uploaded successfully." });
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = async () => {
    if (headerMediaFilename) {
      try {
        await fetch(`/api/upload?path=${encodeURIComponent(headerMediaFilename)}`, { method: "DELETE", credentials: "include" });
      } catch {}
    }
    setHeaderMediaUrl("");
    setHeaderMediaFilename("");
  };

  const saveMutation = useMutation({
    mutationFn: async (sendNow: boolean) => {
      const data: any = {
        name,
        templateId: selectedTemplateId,
        listIds: selectedListIds,
        headerMediaUrl: headerMediaUrl || templateMediaUrl || undefined,
        scheduledAt: sendNow ? undefined : scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        status: scheduledAt && !sendNow ? "scheduled" : "draft",
      };

      if (isEdit && params?.id) {
        return apiRequest("PATCH", `/api/notifications/${params.id}`, data);
      }
      return apiRequest("POST", "/api/notifications", data);
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Notification updated" : "Notification created",
        description: isEdit ? "Your notification has been updated." : "Your notification has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      navigate("/notifications");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error?.message?.replace(/^\d+:\s*/, "") ||
          "Failed to save notification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      setIsSending(true);
      const data: any = {
        name,
        templateId: selectedTemplateId,
        listIds: selectedListIds,
        headerMediaUrl: headerMediaUrl || templateMediaUrl || undefined,
      };

      let notificationId: string;

      if (isEdit && params?.id) {
        await apiRequest("PATCH", `/api/notifications/${params.id}`, data);
        notificationId = params.id;
      } else {
        const res = await apiRequest("POST", "/api/notifications", data);
        const created = await res.json();
        notificationId = created.id;
      }

      return apiRequest("POST", `/api/notifications/${notificationId}/send`);
    },
    onSuccess: () => {
      toast({
        title: "Notification sending",
        description: "Your notification is being sent to recipients.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      navigate("/notifications");
    },
    onError: async (error: any) => {
      let message = "Failed to send notification. Please try again.";
      try {
        if (error?.message) {
          message = error.message;
        }
      } catch {}
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setIsSending(false);
    },
  });

  const toggleList = (listId: string) => {
    if (selectedListIds.includes(listId)) {
      setSelectedListIds(selectedListIds.filter((id) => id !== listId));
    } else {
      setSelectedListIds([...selectedListIds, listId]);
    }
  };

  const totalRecipients = lists
    .filter((l) => selectedListIds.includes(l.id))
    .reduce((sum, l) => sum + (l.contactCount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            {isEdit ? "Edit Notification" : "Add Notification"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update your notification settings" : "Create a new broadcast notification"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name for this notification"
                  className="mt-1.5"
                  data-testid="input-notification-name"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This name is for your reference only and won't be shown to recipients.
                </p>
              </div>

              <div>
                <Label>Notification Type</Label>
                <p className="text-sm text-muted-foreground mb-3">Select the type of notification you want to send.</p>
                <RadioGroup
                  value={notificationType}
                  onValueChange={(val) => setNotificationType(val as typeof notificationType)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="bulk" id="bulk" className="peer sr-only" />
                    <Label
                      htmlFor="bulk"
                      className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      data-testid="radio-bulk-broadcast"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">Bulk Broadcast</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Send one-time, bulk broadcast messages to multiple contacts at once.
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="transactional" id="transactional" className="peer sr-only" />
                    <Label
                      htmlFor="transactional"
                      className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      data-testid="radio-transactional"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5" />
                        <span className="font-medium">Transactional / Integration / API</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Send notification to specific users when triggered from your website or a 3rd party app.
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-primary">Marketing Messages API Status: ONBOARDED</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        You have been successfully onboarded to MM API. WhatsApp will automatically optimize your marketing messages and you can see similar or better delivery rates for your marketing campaigns compared to earlier. Per-message charges will be same as earlier.
                      </p>
                      <button className="text-sm text-primary hover:underline mt-1">
                        Do not show this message again
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Recipients</CardTitle>
              <CardDescription>Choose which contact lists to send this notification to.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <RadioGroup defaultValue="lists" className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lists" id="contact-lists" />
                    <Label htmlFor="contact-lists" className="font-normal">Contact Lists</Label>
                  </div>
                  <div className="flex items-center space-x-2 opacity-50">
                    <RadioGroupItem value="segments" id="segments" disabled />
                    <Label htmlFor="segments" className="font-normal">Smart Segments</Label>
                    <Badge variant="outline" className="text-xs">Upgrade required</Badge>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Select recipients</Label>
                <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                  {lists.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No contact lists found. Create a list first.
                    </p>
                  ) : (
                    lists.map((list) => (
                      <div key={list.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={list.id}
                          checked={selectedListIds.includes(list.id)}
                          onCheckedChange={() => toggleList(list.id)}
                          data-testid={`checkbox-list-${list.id}`}
                        />
                        <Label htmlFor={list.id} className="font-normal flex-1 cursor-pointer">
                          {list.name}
                        </Label>
                        <Badge variant="secondary">{list.contactCount ?? 0}</Badge>
                      </div>
                    ))
                  )}
                </div>
                {selectedListIds.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {selectedListIds.length} list(s), {totalRecipients.toLocaleString()} recipients
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Template</CardTitle>
              <CardDescription>Choose an approved message template to send.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="mt-1.5" data-testid="select-template">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTemplates.length === 0 ? (
                      <SelectItem value="none" disabled>No approved templates</SelectItem>
                    ) : (
                      approvedTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {approvedTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    You need at least one approved template to create a notification.
                  </p>
                )}
              </div>

              {selectedTemplate && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Template Preview</h4>
                  <div className="bg-background rounded-lg p-3 shadow-sm border max-w-sm">
                    {(selectedTemplate.components as any[])?.map((component: any, i: number) => (
                      <div key={i} className="text-sm">
                        {component.type === "HEADER" && component.format === "IMAGE" && (
                          <div className="bg-muted rounded mb-2 p-4 text-center text-muted-foreground text-xs">
                            {(headerMediaUrl || component.mediaUrl) ? (
                              <img src={headerMediaUrl || component.mediaUrl} alt="Header" className="max-h-32 mx-auto rounded" />
                            ) : (
                              "Image header - provide URL below"
                            )}
                          </div>
                        )}
                        {component.type === "HEADER" && component.format === "VIDEO" && (
                          <div className="bg-muted rounded mb-2 p-4 text-center text-muted-foreground text-xs">
                            Video header - provide URL below
                          </div>
                        )}
                        {component.type === "HEADER" && component.format === "DOCUMENT" && (
                          <div className="bg-muted rounded mb-2 p-4 text-center text-muted-foreground text-xs">
                            Document header - provide URL below
                          </div>
                        )}
                        {component.type === "HEADER" && component.text && (
                          <p className="font-semibold mb-1">{component.text}</p>
                        )}
                        {component.type === "BODY" && (
                          <p className="text-foreground whitespace-pre-wrap">{component.text}</p>
                        )}
                        {component.type === "FOOTER" && (
                          <p className="text-xs text-muted-foreground mt-2">{component.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasMediaHeader && (
                <div>
                  <Label>Header Media</Label>
                  <p className="text-sm text-muted-foreground mb-1.5">
                    Attach the {headerMediaType} to send with this notification. This doesn't have to match the
                    sample used when the template was submitted for approval - WhatsApp only required a sample for
                    review, so you can send a different {headerMediaType} with every campaign.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={
                      headerMediaType === "image" ? "image/jpeg,image/png,image/webp" :
                      headerMediaType === "video" ? "video/mp4,video/quicktime" : "application/pdf"
                    }
                    onChange={handleFileUpload}
                    data-testid="input-header-media-file"
                  />
                  {headerMediaUrl ? (
                    <div className="mt-1.5 flex items-center gap-3 rounded-lg border p-3">
                      {headerMediaType === "image" ? (
                        <img src={headerMediaUrl} alt="Header" className="h-16 w-16 object-cover rounded" />
                      ) : (
                        <div className="h-16 w-16 flex items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                          {headerMediaType}
                        </div>
                      )}
                      <div className="flex-1 text-sm text-muted-foreground">Media attached, will be sent with this notification.</div>
                      <Button type="button" variant="ghost" size="icon" onClick={handleRemoveMedia} data-testid="button-remove-header-media">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : templateMediaUrl ? (
                    <div className="mt-1.5 flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <div className="flex-1 text-sm text-muted-foreground">
                        No media attached for this send - the template's original {headerMediaType} will be reused.
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        data-testid="button-upload-header-media"
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {isUploading ? "Uploading..." : "Attach different media"}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        data-testid="button-upload-header-media"
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {isUploading ? "Uploading..." : `Upload ${selectedTemplateHeader?.format?.toLowerCase()}`}
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">
                        This template requires a {selectedTemplateHeader?.format?.toLowerCase()} in the header - upload one to send with this notification.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schedule (Optional)</CardTitle>
              <CardDescription>Choose when to send this notification.</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Send at</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1.5 max-w-xs"
                  data-testid="input-scheduled-at"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Leave empty to save as draft, or set a date/time to schedule.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !name || !selectedTemplateId || selectedListIds.length === 0 || needsMediaUrl}
                data-testid="button-send-now"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMutation.isPending ? "Sending..." : "Save & Send Now"}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => saveMutation.mutate(false)}
                disabled={saveMutation.isPending || !name}
                data-testid="button-save-draft"
              >
                <Clock className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : scheduledAt ? "Schedule" : "Save as Draft"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipients</span>
                <span className="font-medium">{totalRecipients.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lists</span>
                <span className="font-medium">{selectedListIds.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Template</span>
                <span className="font-medium">{selectedTemplate?.name || "Not selected"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">{scheduledAt ? "Scheduled" : "Draft"}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
