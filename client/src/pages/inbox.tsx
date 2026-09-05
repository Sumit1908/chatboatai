import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Send,
  Clock,
  Check,
  CheckCheck,
  MessageSquare,
  User,
  MoreVertical,
  Paperclip,
  FileText,
  Phone,
  X,
  Plus,
  Ban,
  Trash2,
  Tag,
  RefreshCw,
  Filter,
  Download,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, ConversationMessage, Template, Contact } from "@shared/schema";

type FilterTab = "all" | "active" | "closed";

export default function Inbox() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [newMessage, setNewMessage] = useState("");
  const [showContactPanel, setShowContactPanel] = useState(true);
  const [contactNotes, setContactNotes] = useState("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const allConversationsKey = ["/api/conversations"];
  const repliedConversationsKey = ["/api/conversations", { filter: "replied" }];

  const { data: allConversations = [], isLoading: isLoadingAll } = useQuery<Conversation[]>({
    queryKey: allConversationsKey,
    queryFn: async () => {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: repliedConversations = [], isLoading: isLoadingReplied } = useQuery<Conversation[]>({
    queryKey: repliedConversationsKey,
    queryFn: async () => {
      const res = await fetch("/api/conversations?filter=replied", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const repliedIds = new Set(repliedConversations.map(c => c.id));
  const conversations = filterTab === "active" ? repliedConversations : allConversations;
  // "closed" still needs the recent-window "all" list to check each
  // conversation against repliedIds, so it only counts as loading once that
  // query (not just whichever tab happens to be selected) has data.
  const isLoading = filterTab === "active" ? isLoadingReplied : isLoadingAll;

  const avatarPalette = [
    { bg: "bg-[#141A46]", text: "text-white" },
    { bg: "bg-[#7B82AD]", text: "text-white" },
    { bg: "bg-[#19C3E6]", text: "text-[#0B1030]" },
    { bg: "bg-[#4B5273]", text: "text-white" },
  ];
  const getAvatarColor = (key: string) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    return avatarPalette[Math.abs(hash) % avatarPalette.length];
  };

  // A conversation is "missed" when the contact replied, the business never
  // saw it (still unread), and the 24-hour customer service window has now
  // expired - meaning the only way to reach them again is a template message.
  const isMissedReply = (conv: Conversation) => {
    if (!repliedIds.has(conv.id)) return false;
    if ((conv.unreadCount ?? 0) === 0) return false;
    if (!conv.lastMessageAt) return false;
    const hoursSinceLastMessage = (Date.now() - new Date(conv.lastMessageAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceLastMessage >= 24;
  };

  const { data: messages = [] } = useQuery<ConversationMessage[]>({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    enabled: !!selectedConversation,
    refetchInterval: 5000,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const approvedTemplates = templates.filter((t) => t.status === "APPROVED");

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content,
        direction: "outbound",
        type: "text",
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send",
        description: error?.message || "Message could not be sent via WhatsApp",
        variant: "destructive",
      });
    },
  });

  const sendTemplateMutation = useMutation({
    mutationFn: async ({ conversationId, templateId }: { conversationId: string; templateId: string }) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content: `[Template: ${templates.find(t => t.id === templateId)?.name || templateId}]`,
        direction: "outbound",
        type: "template",
        templateName: templates.find(t => t.id === templateId)?.name,
      });
    },
    onSuccess: () => {
      setShowTemplateDialog(false);
      setSelectedTemplateId("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Template sent", description: "Template message sent successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send template",
        description: error?.message || "Template could not be sent",
        variant: "destructive",
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return apiRequest("PATCH", `/api/conversations/${conversationId}`, { unreadCount: 0 });
    },
    // Update the Active count and the bold->regular font the instant you
    // click a conversation, instead of waiting on a network round trip -
    // rolled back automatically if the request actually fails.
    onMutate: async (conversationId: string) => {
      await queryClient.cancelQueries({ queryKey: allConversationsKey });
      await queryClient.cancelQueries({ queryKey: repliedConversationsKey });
      const previousAll = queryClient.getQueryData<Conversation[]>(allConversationsKey);
      const previousReplied = queryClient.getQueryData<Conversation[]>(repliedConversationsKey);
      const markRead = (list?: Conversation[]) =>
        list?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
      queryClient.setQueryData(allConversationsKey, markRead(previousAll));
      queryClient.setQueryData(repliedConversationsKey, markRead(previousReplied));
      return { previousAll, previousReplied };
    },
    onError: (_err, _conversationId, context) => {
      if (context?.previousAll) queryClient.setQueryData(allConversationsKey, context.previousAll);
      if (context?.previousReplied) queryClient.setQueryData(repliedConversationsKey, context.previousReplied);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: allConversationsKey });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations
    .filter((c) => {
      const matchesSearch = !searchQuery || 
        c.contactPhone.includes(searchQuery) || 
        (c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      if (filterTab === "closed") return matchesSearch && isMissedReply(c);
      if (filterTab === "active") return matchesSearch && repliedIds.has(c.id) && !isMissedReply(c);
      return matchesSearch;
    });

  const selectedConv = conversations.find((c) => c.id === selectedConversation);
  const selectedContact = selectedConv ? contacts.find(c => c.phone === selectedConv.contactPhone) : null;

  const handleSelectConversation = (convId: string) => {
    setSelectedConversation(convId);
    const conv = conversations.find((c) => c.id === convId);
    if (conv && (conv.unreadCount ?? 0) > 0) {
      markReadMutation.mutate(convId);
    }
  };

  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: newMessage.trim(),
    });
  };

  const handleSendTemplate = () => {
    if (!selectedConversation || !selectedTemplateId) return;
    sendTemplateMutation.mutate({
      conversationId: selectedConversation,
      templateId: selectedTemplateId,
    });
  };

  const isWindowOpen = (conv: Conversation | undefined) => {
    if (!conv) return false;
    if (conv.windowEndsAt) {
      return new Date(conv.windowEndsAt) > new Date();
    }
    if (conv.lastMessageAt) {
      const lastMsg = new Date(conv.lastMessageAt);
      const hoursSinceLastMsg = (Date.now() - lastMsg.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastMsg < 24;
    }
    return false;
  };

  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days[d.getDay()];
    }
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  };

  const formatFullTime = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const getStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "failed":
        return <X className="h-3 w-3 text-destructive" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getMediaKind = (url: string): "image" | "video" | "document" => {
    const ext = url.split(".").pop()?.toLowerCase().split("?")[0] || "";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
    if (["mp4", "mov", "3gp"].includes(ext)) return "video";
    return "document";
  };

  const totalUnread = allConversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  // The Active badge counts unread replies specifically (like an inbox
  // unread count), not the total number of active conversations - opening
  // one and marking it read should visibly decrement this number, while the
  // conversation itself stays in the Active list.
  const activeCount = repliedConversations.filter(c => !isMissedReply(c) && (c.unreadCount ?? 0) > 0).length;
  const closedCount = allConversations.filter(c => isMissedReply(c)).length;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-4">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title" data-testid="text-page-title">Inbox</h1>
          <p className="page-subtitle">
            {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"} · {allConversations.length} conversations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
            }}
            data-testid="button-refresh-conversations"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="app-surface flex gap-0 flex-1 min-h-0 overflow-hidden">
        <div className="w-80 flex flex-col border-r bg-card shrink-0">
          <div className="p-3 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts and messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-conversations"
              />
            </div>
            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1" data-testid="tab-all">
                  All
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-1" data-testid="tab-active">
                  Active ({activeCount})
                </TabsTrigger>
                <TabsTrigger value="closed" className="flex-1" data-testid="tab-closed">
                  Closed ({closedCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {isLoading ? (
                <div className="p-2 space-y-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 animate-in fade-in duration-300" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="relative overflow-hidden h-10 w-10 rounded-full bg-[#075E54]/[0.06] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent" />
                      <div className="flex-1 space-y-2">
                        <div className="relative overflow-hidden h-3.5 rounded bg-[#075E54]/[0.06] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent" style={{ width: `${50 + Math.random() * 30}%` }} />
                        <div className="relative overflow-hidden h-3 rounded bg-[#075E54]/[0.04] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent" style={{ width: `${60 + Math.random() * 25}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No conversations</p>
                  <p className="text-xs mt-1">
                    {filterTab === "all"
                      ? "Send a notification to start conversations"
                      : filterTab === "closed"
                        ? "No missed replies - you're caught up within 24 hours"
                        : "No active conversations"}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const avatarColor = getAvatarColor(conv.contactName || conv.contactPhone);
                  return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      "w-full p-3 text-left hover-elevate flex gap-3 transition-colors border-l-[3px]",
                      selectedConversation === conv.id
                        ? "bg-accent/40 border-l-[hsl(var(--chart-2))]"
                        : "border-l-transparent"
                    )}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={cn(avatarColor.bg, avatarColor.text)}>
                        {conv.contactName ? conv.contactName[0].toUpperCase() : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "truncate text-sm",
                          (conv.unreadCount ?? 0) > 0 ? "font-semibold" : "font-medium"
                        )}>
                          {conv.contactName || conv.contactPhone}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={cn(
                          "text-xs truncate",
                          (conv.unreadCount ?? 0) > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {conv.lastMessage || "No messages"}
                        </p>
                        {(conv.unreadCount ?? 0) > 0 && (
                          <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs shrink-0">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {isMissedReply(conv) && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Missed reply
                        </Badge>
                      )}
                    </div>
                  </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversation && selectedConv ? (
            <>
              <div className="p-3 border-b flex items-center justify-between gap-2 bg-card shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={cn(getAvatarColor(selectedConv.contactName || selectedConv.contactPhone).bg, getAvatarColor(selectedConv.contactName || selectedConv.contactPhone).text)}>
                      {selectedConv.contactName ? selectedConv.contactName[0].toUpperCase() : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{selectedConv.contactName || selectedConv.contactPhone}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {selectedConv.contactPhone}
                    </div>
                  </div>
                  {isWindowOpen(selectedConv) ? (
                    <Badge variant="default" className="shrink-0 text-xs bg-[hsl(var(--chart-2))] text-[#0B1030]">● Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 text-xs">Template only</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowContactPanel(!showContactPanel)}
                    data-testid="button-toggle-contact-panel"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-conversation-menu">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setShowTemplateDialog(true)}
                        data-testid="menu-send-template"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Send template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex flex-1 min-h-0">
                <div className="flex-1 flex flex-col min-w-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No messages yet</p>
                          <p className="text-xs mt-1">Send a template message to start the conversation</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setShowTemplateDialog(true)}
                            data-testid="button-send-first-template"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Send Template
                          </Button>
                        </div>
                      ) : (
                        <>
                          {messages.map((msg, idx) => {
                            const prevMsg = idx > 0 ? messages[idx - 1] : null;
                            const showDate = !prevMsg || (
                              msg.sentAt && prevMsg.sentAt &&
                              new Date(msg.sentAt).toDateString() !== new Date(prevMsg.sentAt).toDateString()
                            );

                            return (
                              <div key={msg.id}>
                                {showDate && msg.sentAt && (
                                  <div className="flex justify-center my-4">
                                    <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                                      {new Date(msg.sentAt).toLocaleDateString([], {
                                        weekday: "short", day: "numeric", month: "short"
                                      })}
                                    </span>
                                  </div>
                                )}
                                <div className={cn(
                                  "flex",
                                  msg.direction === "outbound" ? "justify-end" : "justify-start"
                                )}>
                                  <div className={cn(
                                    "max-w-[70%] rounded-lg px-3 py-2",
                                    msg.direction === "outbound"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  )}>
                                    {msg.type === "template" && (
                                      <div className={cn(
                                        "text-xs mb-1 flex items-center gap-1",
                                        msg.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"
                                      )}>
                                        <FileText className="h-3 w-3" />
                                        Template
                                      </div>
                                    )}
                                    {msg.mediaUrl && (
                                      getMediaKind(msg.mediaUrl) === "image" ? (
                                        <img
                                          src={msg.mediaUrl}
                                          alt="Attachment"
                                          className="rounded-md max-h-56 max-w-full mb-1.5 object-cover"
                                        />
                                      ) : getMediaKind(msg.mediaUrl) === "video" ? (
                                        <video src={msg.mediaUrl} controls className="rounded-md max-h-56 max-w-full mb-1.5" />
                                      ) : (
                                        <a
                                          href={msg.mediaUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={cn(
                                            "flex items-center gap-2 rounded-md border px-2.5 py-2 mb-1.5 text-xs",
                                            msg.direction === "outbound" ? "border-primary-foreground/30" : "border-border"
                                          )}
                                        >
                                          <FileText className="h-4 w-4 shrink-0" />
                                          <span className="truncate flex-1">{msg.mediaUrl.split("/").pop()}</span>
                                          <Download className="h-3.5 w-3.5 shrink-0" />
                                        </a>
                                      )
                                    )}
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <div className={cn(
                                      "flex items-center justify-end gap-1 mt-1",
                                      msg.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"
                                    )}>
                                      <span className="text-xs">
                                        {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                      </span>
                                      {msg.direction === "outbound" && getStatusIcon(msg.status)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="p-3 border-t bg-card shrink-0">
                    {!isWindowOpen(selectedConv) && (
                      <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-muted text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>24-hour conversation window is closed. Send a message template or notification to start it.</span>
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setShowTemplateDialog(true)}
                        data-testid="button-send-template"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Textarea
                        placeholder={isWindowOpen(selectedConv)
                          ? "Type a message..."
                          : "Send a template to open the conversation window..."
                        }
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="min-h-10 max-h-32 resize-none"
                        rows={1}
                        disabled={!isWindowOpen(selectedConv)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        data-testid="input-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending || !isWindowOpen(selectedConv)}
                        className="shrink-0 bg-[hsl(var(--chart-2))] text-[#0B1030] hover:bg-[hsl(var(--chart-2))]/90"
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {showContactPanel && (
                  <div className="w-72 border-l bg-card shrink-0 flex flex-col">
                    <div className="p-3 border-b flex items-center justify-between">
                      <span className="font-medium text-sm">Contact Details</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowContactPanel(false)}
                        data-testid="button-close-contact-panel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-4">
                        <div className="flex flex-col items-center text-center">
                          <Avatar className="h-16 w-16 mb-2">
                            <AvatarFallback className={cn("text-lg", getAvatarColor(selectedConv.contactName || selectedConv.contactPhone).bg, getAvatarColor(selectedConv.contactName || selectedConv.contactPhone).text)}>
                              {selectedConv.contactName ? selectedConv.contactName[0].toUpperCase() : <User className="h-6 w-6" />}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{selectedConv.contactName || "Unknown"}</span>
                          <span className="text-sm text-muted-foreground">{selectedConv.contactPhone}</span>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversation</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">24-hour window</span>
                              <span className={cn("font-medium", isWindowOpen(selectedConv) ? "text-green-600" : "text-muted-foreground")}>
                                {isWindowOpen(selectedConv) ? "Open" : "Closed"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reply status</span>
                              <Badge variant={isMissedReply(selectedConv) ? "secondary" : "default"}>
                                {isMissedReply(selectedConv) ? "Missed reply" : repliedIds.has(selectedConv.id) ? "Replied" : "No reply yet"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {selectedContact && (
                          <>
                            <div className="space-y-3">
                              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact data</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Created on</span>
                                  <span>{formatFullTime(selectedContact.createdAt)}</span>
                                </div>
                                {selectedContact.name && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Name</span>
                                    <span className="font-medium">{selectedContact.name}</span>
                                  </div>
                                )}
                                {selectedContact.email && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email</span>
                                    <span className="text-xs">{selectedContact.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Separator />
                          </>
                        )}

                        <div className="space-y-3">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</h4>
                          <Textarea
                            placeholder="Add notes about this contact..."
                            value={contactNotes}
                            onChange={(e) => setContactNotes(e.target.value)}
                            className="min-h-20 text-sm resize-none"
                            data-testid="input-contact-notes"
                          />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact actions</h4>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            data-testid="button-block-contact"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Block
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/30">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a conversation from the list to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Template Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {approvedTemplates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No approved templates available
                    </div>
                  ) : (
                    approvedTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <span>{t.name}</span>
                          <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedTemplateId && (() => {
              const tmpl = templates.find(t => t.id === selectedTemplateId);
              const comps = (tmpl?.components as any[]) || [];
              const bodyComp = comps.find((c: any) => c.type === "BODY");
              return bodyComp ? (
                <div className="p-3 rounded-md bg-muted text-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
                  <p className="whitespace-pre-wrap">{bodyComp.text}</p>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendTemplate}
              disabled={!selectedTemplateId || sendTemplateMutation.isPending}
              data-testid="button-confirm-send-template"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendTemplateMutation.isPending ? "Sending..." : "Send Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
