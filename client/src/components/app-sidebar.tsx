import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Send,
  MessageSquare,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  Users,
  Bell,
  Inbox,
  ChevronDown,
  ChevronRight,
  Plus,
  Check,
  List,
  Tag,
  Upload,
  Shield,
  Eye,
  EyeOff,
  CreditCard,
  Smartphone,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WhatsAppAccount, Conversation } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FaWhatsapp } from "react-icons/fa";

interface AppSidebarProps {
  pendingTemplates?: number;
  activeCampaigns?: number;
  apiStatus?: "connected" | "disconnected" | "error";
}

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Inbox",
    url: "/inbox",
    icon: Inbox,
    badge: "unreadMessages",
  },
  {
    title: "Templates",
    url: "/templates",
    icon: FileText,
    badge: "pendingTemplates",
  },
];

const contactsSubItems = [
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Lists", url: "/contacts/lists", icon: List },
  { title: "Tags", url: "/contacts/tags", icon: Tag },
  { title: "Import / Export", url: "/contacts/import", icon: Upload },
];

const notificationsSubItems = [
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Add New", url: "/notifications/new", icon: Plus },
];

const bottomNavItems = [
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
];

const settingsItems = [
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ 
  pendingTemplates = 0, 
  activeCampaigns = 0,
  apiStatus = "disconnected" 
}: AppSidebarProps) {
  const [location] = useLocation();
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(location.startsWith("/contacts"));
  const [notificationsOpen, setNotificationsOpen] = useState(location.startsWith("/notifications"));
  const [showManualToken, setShowManualToken] = useState(false);
  const [manualAccount, setManualAccount] = useState({
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    name: "",
  });
  const { toast } = useToast();
  const { user, logout, isLoggingOut } = useAuth();
  
  const isSuperAdmin = user?.role === "super_admin";

  const { data: accountsData } = useQuery<{ accounts: WhatsAppAccount[]; activeAccountId: string }>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts", { credentials: "include" });
      if (!res.ok) return { accounts: [], activeAccountId: "" };
      return res.json();
    },
    retry: false,
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const switchAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await apiRequest("PUT", `/api/accounts/${accountId}/active`);
    },
    onSuccess: () => {
      // Nearly every query in the app is scoped to the active account server-side
      // (contacts, templates, campaigns, notifications, conversations, dashboard
      // data, analytics...). Rather than tracking every key that needs refreshing
      // whenever a new one is added, invalidate everything on account switch.
      queryClient.invalidateQueries();
    },
  });

  const accounts = accountsData?.accounts || [];
  const activeAccount = accounts.find(a => a.id === accountsData?.activeAccountId);
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  const getBadgeCount = (key: string) => {
    if (key === "pendingTemplates") return pendingTemplates;
    if (key === "activeCampaigns") return activeCampaigns;
    if (key === "unreadMessages") return unreadMessages;
    return 0;
  };

  // Fetch Facebook App ID and load SDK only for authenticated workspace (embedded signup).
  const { data: fbConfig } = useQuery<{ appId: string }>({
    queryKey: ["/api/auth/facebook/config"],
  });

  useEffect(() => {
    if (!fbConfig?.appId) return;
    void import("@/lib/facebook-sdk").then(({ loadFacebookSdk }) => {
      loadFacebookSdk(fbConfig.appId).catch(() => {
        // SDK optional — manual token connect still works without it.
      });
    });
  }, [fbConfig?.appId]);

  // Mutation to process the embedded signup response
  const processEmbeddedSignupMutation = useMutation({
    mutationFn: async (data: { accessToken: string; userId: string }) => {
      return apiRequest("POST", "/api/auth/facebook/embedded-signup", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setAddAccountOpen(false);
      toast({
        title: "Account Connected",
        description: "Your WhatsApp Business account has been connected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect WhatsApp Business account.",
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
      setManualAccount({
        phoneNumberId: "",
        businessAccountId: "",
        accessToken: "",
        name: "",
      });
      setAddAccountOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect WhatsApp account. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const handleFacebookLogin = async () => {
    if (!fbConfig?.appId) {
      toast({
        title: "Configuration Required",
        description: "Facebook App credentials are not configured. Please contact the administrator.",
        variant: "destructive",
      });
      return;
    }

    if (!window.FB) {
      toast({
        title: "Loading",
        description: "Facebook SDK is still loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      const { loadFacebookSdk } = await import("@/lib/facebook-sdk");
      await loadFacebookSdk(fbConfig?.appId);
      if (!window.FB) {
        throw new Error("Facebook SDK failed to load");
      }
      // Use Meta's Embedded Signup flow
      // Note: business_management scope is required to access /me/businesses endpoint
      window.FB.login(
        (response: any) => {
          
          if (response.authResponse) {
            // Successfully authenticated - send to backend
            processEmbeddedSignupMutation.mutate({
              accessToken: response.authResponse.accessToken,
              userId: response.authResponse.userID,
            });
          } else {
            toast({
              title: "Login Cancelled",
              description: "Facebook login was cancelled or failed.",
              variant: "destructive",
            });
          }
          setIsConnecting(false);
        },
        {
          scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
          extras: {
            feature: 'whatsapp_embedded_signup'
          }
        }
      );
    } catch (error) {
      console.error("Facebook login error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to initiate Facebook login. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  return (
    <Sidebar variant="floating">
      <SidebarHeader className="border-b border-sidebar-border/80 px-4 py-4 bg-gradient-to-b from-white to-[rgba(220,248,198,0.42)]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/80 p-2.5 hover-elevate text-left shadow-sm" data-testid="button-account-switcher">
              <div className="relative h-9 w-9 shrink-0">
                <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-full bg-[hsl(var(--sidebar-primary))]" />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <FaWhatsapp className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{activeAccount?.name || "Sampark"}</span>
                <span className="text-xs text-muted-foreground truncate">{activeAccount?.phoneNumber || "Choose a WhatsApp number"}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {accounts.map((account) => (
              <DropdownMenuItem 
                key={account.id}
                onClick={() => switchAccountMutation.mutate(account.id)}
                className="flex items-center gap-2"
                data-testid={`account-${account.id}`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{account.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{account.phoneNumber}</div>
                </div>
                {account.id === accountsData?.activeAccountId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid="button-add-account">
                  <Plus className="h-4 w-4 mr-2" />
                  Add WhatsApp Number
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect WhatsApp Number</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="manual" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual" data-testid="tab-manual">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Manual Entry
                    </TabsTrigger>
                    <TabsTrigger value="facebook" data-testid="tab-facebook">
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manual" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="dialog-phone-number-id">Phone Number ID</Label>
                      <Input
                        id="dialog-phone-number-id"
                        value={manualAccount.phoneNumberId}
                        onChange={(e) => setManualAccount(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                        placeholder="e.g., 123456789012345"
                        className="font-mono text-sm"
                        data-testid="input-dialog-phone-number-id"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dialog-waba-id">WABA ID</Label>
                      <Input
                        id="dialog-waba-id"
                        value={manualAccount.businessAccountId}
                        onChange={(e) => setManualAccount(prev => ({ ...prev, businessAccountId: e.target.value }))}
                        placeholder="e.g., 987654321098765"
                        className="font-mono text-sm"
                        data-testid="input-dialog-waba-id"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dialog-access-token">Permanent Access Token</Label>
                      <div className="relative">
                        <Input
                          id="dialog-access-token"
                          type={showManualToken ? "text" : "password"}
                          value={manualAccount.accessToken}
                          onChange={(e) => setManualAccount(prev => ({ ...prev, accessToken: e.target.value }))}
                          placeholder="Enter your access token"
                          className="pr-10 font-mono text-sm"
                          data-testid="input-dialog-access-token"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowManualToken(!showManualToken)}
                          data-testid="button-toggle-dialog-token"
                        >
                          {showManualToken ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={() => addManualAccountMutation.mutate(manualAccount)}
                      disabled={addManualAccountMutation.isPending || !manualAccount.phoneNumberId || !manualAccount.businessAccountId || !manualAccount.accessToken}
                      className="w-full"
                      data-testid="button-add-manual-account-dialog"
                    >
                      {addManualAccountMutation.isPending ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add WhatsApp Number
                        </>
                      )}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="facebook" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Connect using Facebook Embedded Signup flow.
                    </p>
                    <Button 
                      className="w-full" 
                      size="lg" 
                      data-testid="button-facebook-login"
                      onClick={handleFacebookLogin}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )}
                      {isConnecting ? "Connecting..." : "Login with Facebook"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      You'll be redirected to Facebook to authorize access.
                    </p>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(247,251,248,0.94))]">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location === item.url;
                const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {badgeCount > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                          >
                            {badgeCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <Collapsible open={contactsOpen} onOpenChange={setContactsOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={location.startsWith("/contacts")}
                      data-testid="nav-contacts"
                    >
                      <Users className="h-4 w-4" />
                      <span className="flex-1">Contacts</span>
                      {contactsOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {contactsSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === subItem.url}
                            data-testid={`nav-contacts-${subItem.title.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <Link href={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={location.startsWith("/notifications")}
                      data-testid="nav-notifications"
                    >
                      <Bell className="h-4 w-4" />
                      <span className="flex-1">Notifications</span>
                      {notificationsOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {notificationsSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === subItem.url}
                            data-testid={`nav-notifications-${subItem.title.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <Link href={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {bottomNavItems.map((item) => {
                const isActive = location === item.url;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location === item.url;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/admin"}
                    data-testid="nav-admin"
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 p-3 space-y-2.5 bg-gradient-to-t from-[rgba(220,248,198,0.35)] to-white/80">
        <div className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-xs shadow-sm">
          {apiStatus === "connected" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25D366]" />
              </span>
              <Wifi className="h-3.5 w-3.5 text-[#25D366]" />
              <span className="text-[#075E54]/70 font-medium">Meta API Connected</span>
            </>
          ) : apiStatus === "error" ? (
            <>
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
              <span className="text-muted-foreground">Connection Error</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Not Connected</span>
            </>
          )}
        </div>
        {user && (
          <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_12px_32px_-16px_rgba(7,94,84,0.2)]">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] text-sm font-bold text-white shadow-md shadow-[#25D366]/25">
                  {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#25D366]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#25D366]">
                  Workspace User
                </div>
                <div className="text-sm font-medium text-[#075E54] truncate leading-tight mt-0.5">
                  {user.firstName
                    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
                    : user.email || "User"}
                </div>
                {user.firstName && user.email && (
                  <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full h-9 rounded-xl border-[#075E54]/12 bg-[#F7FBF8] text-[#075E54] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors gap-2 font-medium"
              data-testid="button-logout"
              disabled={isLoggingOut}
              onClick={() => logout()}
            >
              <LogOut className="h-3.5 w-3.5" />
              {isLoggingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
