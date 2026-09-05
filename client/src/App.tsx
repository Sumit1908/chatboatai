import { Switch, Route, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { TrialStatusBadge } from "@/components/trial-status-badge";
import { TrialLimitsBanner } from "@/components/trial-limits-banner";
import { EmailVerifyBanner } from "@/components/email-verify-banner";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/dashboard";
import Templates from "@/pages/templates";
import TemplateEditor from "@/pages/template-editor";
import Messages from "@/pages/messages";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Inbox from "@/pages/inbox";
import Contacts from "@/pages/contacts";
import ContactsLists from "@/pages/contacts-lists";
import ContactsTags from "@/pages/contacts-tags";
import ContactsImport from "@/pages/contacts-import";
import Notifications from "@/pages/notifications";
import NotificationEditor from "@/pages/notification-editor";
import NotificationReport from "@/pages/notification-report";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Refund from "@/pages/refund";
import Contact from "@/pages/contact";
import Admin from "@/pages/admin";
import AdminUserDetail from "@/pages/admin-user-detail";
import Billing from "@/pages/billing";
import DeleteData from "@/pages/delete-data";
import Features from "@/pages/features";
import Trust from "@/pages/trust";
import HowItWorks from "@/pages/how-it-works";
import SetupGuide from "@/pages/setup-guide";
import UseCases from "@/pages/use-cases";
import Proof from "@/pages/proof";
import Pricing from "@/pages/pricing";
import Faq from "@/pages/faq";
import NotFound from "@/pages/not-found";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { GoogleAnalytics } from "@/components/google-analytics";
import type { Template, Campaign, DashboardMetrics } from "@shared/schema";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/admin-login",
  "/features",
  "/trust",
  "/how-it-works",
  "/setup-guide",
  "/use-cases",
  "/proof",
  "/pricing",
  "/faq",
  "/privacy",
  "/terms",
  "/refund",
  "/contact",
  "/delete-data",
]);

/** Public content pages authenticated users may still browse (no app shell). */
const PUBLIC_CONTENT_PATHS = new Set([
  "/features",
  "/trust",
  "/how-it-works",
  "/setup-guide",
  "/use-cases",
  "/proof",
  "/pricing",
  "/faq",
  "/privacy",
  "/terms",
  "/refund",
  "/contact",
  "/delete-data",
]);

function AppRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/templates" component={Templates} />
      <Route path="/templates/new" component={TemplateEditor} />
      <Route path="/templates/:id/edit" component={TemplateEditor} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/contacts/lists" component={ContactsLists} />
      <Route path="/contacts/tags" component={ContactsTags} />
      <Route path="/contacts/import" component={ContactsImport} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/notifications/new" component={NotificationEditor} />
      <Route path="/notifications/:id/edit" component={NotificationEditor} />
      <Route path="/notifications/:id/report" component={NotificationReport} />
      <Route path="/messages" component={Messages} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/billing" component={Billing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/refund" component={Refund} />
      <Route path="/contact" component={Contact} />
      <Route path="/delete-data" component={DeleteData} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/features" component={Features} />
      <Route path="/trust" component={Trust} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/setup-guide" component={SetupGuide} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/proof" component={Proof} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/faq" component={Faq} />
      <Route path="/login" component={Login} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/refund" component={Refund} />
      <Route path="/contact" component={Contact} />
      <Route path="/delete-data" component={DeleteData} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  useRealtimeSync();

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    staleTime: 1000 * 60,
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    staleTime: 1000 * 60,
  });

  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 30000,
    staleTime: 1000 * 30,
  });

  const pendingTemplates = templates.filter((t) => t.status === "PENDING").length;
  const activeCampaigns = campaigns.filter((c) => c.status === "running").length;

  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-transparent">
        <AppSidebar
          pendingTemplates={pendingTemplates}
          activeCampaigns={activeCampaigns}
          apiStatus={metrics?.apiStatus || "disconnected"}
        />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <TrialLimitsBanner />
          <EmailVerifyBanner />
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/60 bg-[rgba(255,255,255,0.72)] px-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">ChatBoatAI Workspace</span>
                <span className="text-xs text-muted-foreground">WhatsApp campaigns, inbox and analytics</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrialStatusBadge />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <AppRouter />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AdminApp() {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <Switch>
        <Route path="/admin/users/:userId" component={AdminUserDetail} />
        <Route path="/admin" component={Admin} />
        <Route>
          <Redirect to="/admin" />
        </Route>
      </Switch>
    </div>
  );
}

function PageTracking() {
  usePageTracking();
  return null;
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const isAdminRoute = location === "/admin" || location.startsWith("/admin/users/");

  const primaryDomain = import.meta.env.VITE_PRIMARY_DOMAIN as string | undefined;
  const isAppHost =
    !!primaryDomain && window.location.hostname === `app.${primaryDomain}`;

  // The app subdomain never renders marketing/login pages — bounce logged-out
  // visitors back to the root domain's login instead.
  useEffect(() => {
    if (isLoading || user || !isAppHost) return;
    window.location.href = `https://${primaryDomain}/login`;
  }, [isLoading, user, isAppHost, primaryDomain]);

  // Any authenticated view (dashboard, settings, admin, ...) belongs on the
  // app subdomain. A logged-in user can still land on the root domain via
  // the back button, a bookmark, or typing the bare URL — same-origin
  // client routing can't move them to a different host, so this has to be
  // a real navigation.
  const needsAppHostRedirect =
    !!user && !!primaryDomain && !isAppHost && !PUBLIC_CONTENT_PATHS.has(location);

  useEffect(() => {
    if (isLoading || !user) return;

    if (needsAppHostRedirect) {
      const dest =
        user.role === "super_admin"
          ? isAdminRoute
            ? location
            : "/admin"
          : location === "/" || location === "/login" || location === "/admin-login"
            ? "/dashboard"
            : location;
      window.location.href = `https://app.${primaryDomain}${dest}${window.location.search}`;
      return;
    }

    if (user.role === "super_admin") {
      if (!isAdminRoute) {
        setLocation("/admin");
      }
      return;
    }

    if (location === "/" || location === "/login" || location === "/admin-login") {
      setLocation("/dashboard");
    }
  }, [user, isLoading, location, setLocation, isAdminRoute, needsAppHostRedirect, primaryDomain]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    // Brief spinner while the effect above redirects off the app subdomain.
    if (isAppHost) return null;
    return <PublicRouter />;
  }

  if (needsAppHostRedirect) {
    // Brief spinner while the effect above redirects to app.<domain>.
    return null;
  }

  if (user.role === "super_admin") {
    if (isAdminRoute) {
      return <AdminApp />;
    }
    return null;
  }

  if (PUBLIC_CONTENT_PATHS.has(location)) {
    return <PublicRouter />;
  }

  // /, /login, /admin-login — brief spinner while useEffect redirects to app
  if (PUBLIC_PATHS.has(location)) {
    return null;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="whatsapp-broadcast-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <PageTracking />
            <GoogleAnalytics />
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
