import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Phone, ExternalLink, MessageSquare, Image, FileText, Video, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseApiError } from "@/lib/errors";
import type { Template } from "@shared/schema";

type HeaderType = "none" | "text" | "media";
type MediaType = "image" | "video" | "document";
type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

// Function to format WhatsApp text formatting to HTML
function formatWhatsAppText(text: string): string {
  if (!text) return "";
  
  // Escape HTML first to prevent XSS
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Bold: *text* -> <strong>text</strong>
  formatted = formatted.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
  
  // Italic: _text_ -> <em>text</em>
  formatted = formatted.replace(/_([^_]+)_/g, "<em>$1</em>");
  
  // Strikethrough: ~text~ -> <s>text</s>
  formatted = formatted.replace(/~([^~]+)~/g, "<s>$1</s>");
  
  // Monospace: ```text``` -> <code>text</code>
  formatted = formatted.replace(/```([^`]+)```/g, "<code>$1</code>");
  
  return formatted;
}

interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
}

export default function TemplateEditor() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/templates/:id/edit");
  const isEdit = !!params?.id;
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [language, setLanguage] = useState("en");
  const [templateType, setTemplateType] = useState("custom");
  const [headerType, setHeaderType] = useState<HeaderType>("none");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [headerMediaHandle, setHeaderMediaHandle] = useState("");
  const [headerMediaFilename, setHeaderMediaFilename] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: template } = useQuery<Template>({
    queryKey: ["/api/templates", params?.id],
    enabled: isEdit,
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION");
      setLanguage(template.language);
      
      const headerComponent = template.components?.find(c => c.type === "HEADER");
      const bodyComponent = template.components?.find(c => c.type === "BODY");
      const footerComponent = template.components?.find(c => c.type === "FOOTER");
      const buttonComponents = template.components?.filter(c => c.type === "BUTTONS");

      if (headerComponent) {
        if (headerComponent.format === "TEXT" && headerComponent.text) {
          setHeaderType("text");
          setHeaderText(headerComponent.text);
        } else if (headerComponent.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)) {
          setHeaderType("media");
          setMediaType(headerComponent.format.toLowerCase() as MediaType);
          if (headerComponent.mediaUrl) {
            setHeaderMediaUrl(headerComponent.mediaUrl);
          }
          if ((headerComponent as any).mediaHandle) {
            setHeaderMediaHandle((headerComponent as any).mediaHandle);
          }
        }
      }

      if (bodyComponent?.text) {
        setBodyText(bodyComponent.text);
      }

      if (footerComponent?.text) {
        setFooterText(footerComponent.text);
      }

      if (buttonComponents && buttonComponents.length > 0) {
        const loadedButtons = buttonComponents.flatMap((bc: any) => bc.buttons || []);
        setButtons(loadedButtons.map((b: any) => ({
          type: b.type,
          text: b.text,
          url: b.url,
          phoneNumber: b.phone_number || b.phoneNumber,
        })));
      }
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error(JSON.stringify({ error: "Template name is required" }));
      }
      if (!bodyText.trim()) {
        throw new Error(JSON.stringify({ error: "Template body text is required" }));
      }
      if (headerType === "media" && !headerMediaUrl) {
        throw new Error(JSON.stringify({ error: `Please upload a ${mediaType} for the header before submitting - WhatsApp requires a sample media file for media headers.` }));
      }

      const components: any[] = [];

      if (headerType === "text" && headerText) {
        components.push({ type: "HEADER", format: "TEXT", text: headerText });
      } else if (headerType === "media") {
        components.push({
          type: "HEADER",
          format: mediaType.toUpperCase(),
          mediaUrl: headerMediaUrl || undefined,
          mediaHandle: headerMediaHandle || undefined,
        });
      }

      components.push({ type: "BODY", text: bodyText });

      if (footerText) {
        components.push({ type: "FOOTER", text: footerText });
      }

      if (buttons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: buttons.map(b => ({
            type: b.type,
            text: b.text,
            ...(b.url && { url: b.url }),
            ...(b.phoneNumber && { phone_number: b.phoneNumber }),
          })),
        });
      }

      const data = {
        name,
        category,
        language,
        status: "PENDING",
        components,
      };

      if (isEdit && params?.id) {
        return apiRequest("PATCH", `/api/templates/${params.id}`, data);
      }
      const response = await apiRequest("POST", "/api/templates", data);
      return response;
    },
    onSuccess: async (response: any) => {
      let result: any = {};
      try {
        if (response instanceof Response) {
          const cloned = response.clone();
          result = await cloned.json();
        } else if (typeof response === "object") {
          result = response;
        }
      } catch {}

      if (result?.metaWarning) {
        toast({
          title: "Template Saved as Draft",
          description: `Saved locally but WhatsApp submission had an issue: ${result.metaWarning}. You can resubmit later.`,
        });
      } else if (result?.status === "DRAFT") {
        toast({
          title: "Template Saved as Draft",
          description: "Template saved. Connect a WhatsApp account to submit for approval.",
        });
      } else {
        toast({
          title: isEdit ? "Template Updated" : "Template Submitted",
          description: isEdit ? "Your template has been updated." : "Your template has been submitted for WhatsApp approval.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      apiRequest("POST", "/api/templates/sync").catch(() => {});
      navigate("/templates");
    },
    onError: (error: any) => {
      toast({
        title: "Template Submission Failed",
        description: parseApiError(error, "Failed to save template. Please try again."),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/templates/${params?.id}`);
    },
    onSuccess: () => {
      toast({ title: "Template deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      navigate("/templates");
    },
  });

  const addButton = (type: ButtonType) => {
    if (buttons.length < 3) {
      setButtons([...buttons, { type, text: "" }]);
    }
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], ...updates };
    setButtons(newButtons);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes: Record<MediaType, string[]> = {
      image: ["image/jpeg", "image/png", "image/webp"],
      video: ["video/mp4", "video/quicktime"],
      document: ["application/pdf"],
    };

    if (!allowedTypes[mediaType].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload a valid ${mediaType} file.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size based on media type (WhatsApp limits)
    const sizeLimits: Record<MediaType, number> = {
      image: 5 * 1024 * 1024,     // 5MB for images
      video: 16 * 1024 * 1024,    // 16MB for videos
      document: 100 * 1024 * 1024, // 100MB for documents
    };
    
    if (file.size > sizeLimits[mediaType]) {
      const limitMB = sizeLimits[mediaType] / (1024 * 1024);
      toast({
        title: "File too large",
        description: `Maximum file size for ${mediaType}s is ${limitMB}MB.`,
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

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setHeaderMediaUrl(data.url);
      setHeaderMediaHandle(data.mediaHandle || "");
      setHeaderMediaFilename(data.filename);

      toast({
        title: "File uploaded",
        description: "Your media file has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveMedia = async () => {
    if (headerMediaFilename) {
      try {
        const response = await fetch(`/api/upload?path=${encodeURIComponent(headerMediaFilename)}`, {
          method: "DELETE",
          credentials: "include",
        });
        
        if (!response.ok) {
          const data = await response.json();
          toast({
            title: "Delete failed",
            description: data.error || "Failed to remove file from server.",
            variant: "destructive",
          });
          // Still clear local state even if server delete fails
        }
      } catch (error) {
        console.error("Failed to delete file:", error);
        toast({
          title: "Delete failed",
          description: "Network error while removing file.",
          variant: "destructive",
        });
      }
    }
    setHeaderMediaUrl("");
    setHeaderMediaHandle("");
    setHeaderMediaFilename("");
  };

  const getAcceptedFileTypes = () => {
    switch (mediaType) {
      case "image":
        return "image/jpeg,image/png,image/webp";
      case "video":
        return "video/mp4,video/quicktime";
      case "document":
        return "application/pdf";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            {isEdit ? "Edit Message Template" : "Create Message Template"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update your template settings" : "Create a new WhatsApp message template"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <Label>Template Name</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                    placeholder="e.g., order_confirmation"
                    className="flex-1"
                    disabled={!!template?.metaTemplateId}
                    data-testid="input-template-name"
                  />
                  <span className="text-sm text-muted-foreground">{name.length} / 512</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {template?.metaTemplateId
                    ? "This template has already been submitted to WhatsApp - names can't be changed after submission. Duplicate it if you need a different name."
                    : "Spaces and special characters are not allowed."}
                </p>
              </div>

              <div>
                <Label>Category</Label>
                <p className="text-sm text-muted-foreground mb-2">Select template category</p>
                <RadioGroup
                  value={category}
                  onValueChange={(val) => setCategory(val as typeof category)}
                  className="grid grid-cols-3 gap-4"
                >
                  <div>
                    <RadioGroupItem value="MARKETING" id="marketing" className="peer sr-only" />
                    <Label
                      htmlFor="marketing"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      data-testid="radio-marketing"
                    >
                      <MessageSquare className="mb-3 h-6 w-6" />
                      <span className="font-medium">Marketing</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        One-to-many bulk broadcast marketing messages
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="UTILITY" id="utility" className="peer sr-only" />
                    <Label
                      htmlFor="utility"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      data-testid="radio-utility"
                    >
                      <FileText className="mb-3 h-6 w-6" />
                      <span className="font-medium">Utility</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Transactional messages sent on some user action
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="AUTHENTICATION" id="authentication" className="peer sr-only" />
                    <Label
                      htmlFor="authentication"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      data-testid="radio-authentication"
                    >
                      <Phone className="mb-3 h-6 w-6" />
                      <span className="font-medium">Authentication</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        One time password messages for authentication
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-1.5" data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="en_US">English (US)</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">Select template language</p>
                </div>
                <div>
                  <Label>Template Type</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger className="mt-1.5" data-testid="select-template-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                      <SelectItem value="catalog">Catalog</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">Select template type</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Header <span className="text-muted-foreground font-normal">(Optional)</span></CardTitle>
              <CardDescription>Add a title that you want to show in message header.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Header Type</Label>
                  <Select value={headerType} onValueChange={(val) => setHeaderType(val as HeaderType)}>
                    <SelectTrigger className="mt-1.5" data-testid="select-header-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">Select the header type.</p>
                </div>
                {headerType === "media" && (
                  <div>
                    <Label>Media Type</Label>
                    <Select value={mediaType} onValueChange={(val) => setMediaType(val as MediaType)}>
                      <SelectTrigger className="mt-1.5" data-testid="select-media-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {headerType === "text" && (
                <div>
                  <Label>Header Text</Label>
                  <Input
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="Enter header text"
                    maxLength={60}
                    className="mt-1.5"
                    data-testid="input-header-text"
                  />
                  <p className="text-sm text-muted-foreground mt-1">{headerText.length} / 60</p>
                </div>
              )}

              {headerType === "media" && (
                <div>
                  <Label>Upload Sample {mediaType === "image" ? "Image" : mediaType === "video" ? "Video" : "Document"}</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept={getAcceptedFileTypes()}
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-media-file"
                  />
                  
                  {headerMediaUrl ? (
                    <div className="mt-1.5 border-2 border-dashed rounded-lg p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {mediaType === "image" ? (
                            <img 
                              src={headerMediaUrl} 
                              alt="Header preview" 
                              className="h-16 w-16 object-cover rounded"
                            />
                          ) : (
                            <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                              {mediaType === "video" ? (
                                <Video className="h-8 w-8 text-muted-foreground" />
                              ) : (
                                <FileText className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{headerMediaFilename.split("/").pop()}</p>
                            <p className="text-xs text-muted-foreground">
                              {mediaType === "image" ? "Image" : mediaType === "video" ? "Video" : "Document"} uploaded
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={handleRemoveMedia}
                          data-testid="button-remove-media"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="mt-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="dropzone-media"
                    >
                      <div className="flex items-center justify-center gap-2 mb-3">
                        {mediaType === "image" ? <Image className="h-10 w-10 text-muted-foreground" /> :
                         mediaType === "video" ? <Video className="h-10 w-10 text-muted-foreground" /> :
                         <FileText className="h-10 w-10 text-muted-foreground" />}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isUploading}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        data-testid="button-choose-file"
                      >
                        {isUploading ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </>
                        )}
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Click to select a file
                      </p>
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload a sample {mediaType} for WhatsApp to review. The header {mediaType} is dynamic and can be replaced when sending template.
                    Supported file formats: {mediaType === "image" ? "JPEG, PNG, WebP" : mediaType === "video" ? "MP4, MOV" : "PDF"}. 
                    Max allowed file size: {mediaType === "image" ? "5MB" : mediaType === "video" ? "16MB" : "100MB"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Body</CardTitle>
              <CardDescription>Enter the text for your message in the language you've selected.</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Body Content</Label>
                <div className="relative mt-1.5">
                  <Textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Enter your message content here..."
                    className="min-h-[150px] resize-none pr-12"
                    maxLength={1024}
                    data-testid="input-body-text"
                  />
                  <span className="absolute bottom-2 right-2 text-sm text-muted-foreground">
                    {bodyText.length} / 1024
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter body content. HTML not allowed. You can format the text using following shortcuts:
                </p>
                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  <p>Bold: *text* will become <strong>text</strong></p>
                  <p>Italics: _text_ will become <em>text</em></p>
                  <p>Strikethrough: ~text~ will become <s>text</s></p>
                  <p>Monospace or code: ```text``` will become <code>text</code></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Footer <span className="text-muted-foreground font-normal">(Optional)</span></CardTitle>
              <CardDescription>Add a short line of text to the bottom of your message template.</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Footer Text</Label>
                <div className="relative mt-1.5">
                  <Input
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Enter footer text"
                    maxLength={60}
                    data-testid="input-footer-text"
                  />
                  <span className="absolute top-1/2 -translate-y-1/2 right-3 text-sm text-muted-foreground">
                    {footerText.length} / 60
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Enter footer text.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Button <span className="text-muted-foreground font-normal">(Optional)</span></CardTitle>
              <CardDescription>Create buttons that let customers respond to your message or take action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Select onValueChange={(val) => addButton(val as ButtonType)} value="">
                  <SelectTrigger data-testid="select-add-button">
                    <SelectValue placeholder="+ Add a button" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                    <SelectItem value="URL">Visit Website (URL)</SelectItem>
                    <SelectItem value="PHONE_NUMBER">Call Phone Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {buttons.map((button, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {button.type === "QUICK_REPLY" && <MessageSquare className="h-4 w-4" />}
                      {button.type === "URL" && <ExternalLink className="h-4 w-4" />}
                      {button.type === "PHONE_NUMBER" && <Phone className="h-4 w-4" />}
                      <span className="font-medium">
                        {button.type === "QUICK_REPLY" ? "Quick Reply" :
                         button.type === "URL" ? "Visit Website" : "Call To Action"}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeButton(index)} data-testid={`button-remove-${index}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <Label>Button Text</Label>
                      <div className="relative mt-1.5">
                        <Input
                          value={button.text}
                          onChange={(e) => updateButton(index, { text: e.target.value })}
                          placeholder="Enter button text"
                          maxLength={25}
                          data-testid={`input-button-text-${index}`}
                        />
                        <span className="absolute top-1/2 -translate-y-1/2 right-3 text-sm text-muted-foreground">
                          {button.text.length} / 25
                        </span>
                      </div>
                    </div>

                    {button.type === "URL" && (
                      <div>
                        <Label>Website URL</Label>
                        <Input
                          value={button.url || ""}
                          onChange={(e) => updateButton(index, { url: e.target.value })}
                          placeholder="https://example.com"
                          className="mt-1.5"
                          data-testid={`input-button-url-${index}`}
                        />
                      </div>
                    )}

                    {button.type === "PHONE_NUMBER" && (
                      <div>
                        <Label>Phone Number</Label>
                        <div className="relative mt-1.5">
                          <Input
                            value={button.phoneNumber || ""}
                            onChange={(e) => updateButton(index, { phoneNumber: e.target.value })}
                            placeholder="+919315845623"
                            data-testid={`input-button-phone-${index}`}
                          />
                          <span className="absolute top-1/2 -translate-y-1/2 right-3 text-sm text-muted-foreground">
                            {(button.phoneNumber?.length || 0)} / 20
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {buttons.length >= 3 && (
                <p className="text-sm text-muted-foreground">Maximum 3 buttons allowed per template.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEdit && template && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={template.status === "APPROVED" ? "default" : template.status === "PENDING" ? "secondary" : "destructive"}>
                    {template.status}
                  </Badge>
                </div>
              )}
              
              <Button 
                className="w-full" 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !name || !bodyText}
                data-testid="button-save-template"
              >
                {saveMutation.isPending ? "Saving..." : isEdit ? "Re-submit for Approval" : "Submit for Approval"}
              </Button>

              {isEdit && (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-template"
                >
                  Delete
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4">
                <div className="bg-background rounded-lg shadow-sm border overflow-hidden max-w-xs mx-auto">
                  {headerType === "media" && (
                    <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                      {headerMediaUrl && mediaType === "image" ? (
                        <img 
                          src={headerMediaUrl} 
                          alt="Header preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : mediaType === "image" ? (
                        <Image className="h-12 w-12 text-muted-foreground" />
                      ) : mediaType === "video" ? (
                        <Video className="h-12 w-12 text-muted-foreground" />
                      ) : (
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    {headerType === "text" && headerText && (
                      <p className="font-semibold text-sm">{headerText}</p>
                    )}
                    <p 
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: formatWhatsAppText(bodyText) || "Your message content will appear here..." 
                      }}
                    />
                    {footerText && (
                      <p className="text-xs text-muted-foreground">{footerText}</p>
                    )}
                  </div>
                  {buttons.length > 0 && (
                    <div className="border-t divide-y">
                      {buttons.map((button, i) => (
                        <div key={i} className="p-2 text-center text-sm text-primary font-medium flex items-center justify-center gap-1">
                          {button.type === "URL" && <ExternalLink className="h-3 w-3" />}
                          {button.type === "PHONE_NUMBER" && <Phone className="h-3 w-3" />}
                          {button.text || "Button text"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
