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
import { PlanGate, PlanRequiredBanner, PlanStatusBadge } from "@/components/plan-access";
import { EmailVerifyBanner } from "@/components/email-verify-banner";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/dashboard";
import CrmDashboard from "@/pages/crm/crm-dashboard";
import LeadsPage from "@/pages/crm/leads";
import { DealsPage, PipelinePage } from "@/pages/crm/deals";
import { FollowUpsPage, TasksPage } from "@/pages/crm/tasks";
import ConnectedAppsPage from "@/pages/crm/connected-apps";
import { AutomationPage, ReportsPage } from "@/pages/crm/coming-soon";
import CrmProduct from "@/pages/crm-product";
import IntegrationsPage from "@/pages/integrations";
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
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
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
import { normalizePrimaryDomain } from "@shared/primaryDomain";
import { loginUrlFor, nextFromSearch } from "@/lib/next-path";

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
  "/crm",
  "/integrations",
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
  "/crm",
  "/integrations",
  "/privacy",
  "/terms",
  "/refund",
  "/contact",
  "/delete-data",
  "/forgot-password",
  "/reset-password",
]);

function AppRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={CrmDashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/deals" component={DealsPage} />
      <Route path="/pipeline" component={PipelinePage} />
      <Route path="/follow-ups" component={FollowUpsPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/automation" component={AutomationPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/connected-apps" component={ConnectedAppsPage} />
      {/* WhatsApp module overview (the previous dashboard) */}
      <Route path="/whatsapp" component={Dashboard} />
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

/** Pages that only exist inside the signed-in app (mirrors server/hostRouting.ts). */
const APP_ONLY_PREFIXES = [
  "/dashboard",
  "/inbox",
  "/templates",
  "/contacts",
  "/notifications",
  "/messages",
  "/analytics",
  "/settings",
  "/billing",
  "/leads",
  "/deals",
  "/pipeline",
  "/follow-ups",
  "/tasks",
  "/automation",
  "/reports",
  "/connected-apps",
  "/whatsapp",
];

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isAdminPath(path: string) {
  return matchesPrefix(path, "/admin");
}

function isAppOnlyPath(path: string) {
  return APP_ONLY_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

function PublicRouter() {
  const [location] = useLocation();

  // A signed-out visitor on an app URL (bookmarked /admin?tab=plans, an
  // expired session, a link from an email) has no route in this router and
  // used to fall through to the 404 page. Send them to the matching sign-in
  // page instead; after login AppContent routes them back into the app.
  if (isAdminPath(location)) return <Redirect to="/admin-login" />;
  if (isAppOnlyPath(location)) return <Redirect to={loginUrlFor(location + window.location.search, "login")} />;

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/features" component={Features} />
      <Route path="/crm" component={CrmProduct} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route path="/trust" component={Trust} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/setup-guide" component={SetupGuide} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/proof" component={Proof} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/faq" component={Faq} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
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
          <PlanRequiredBanner />
          <EmailVerifyBanner />
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/60 bg-[rgba(255,255,255,0.72)] px-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">ChatBoatAI Workspace</span>
                <span className="text-xs text-muted-foreground">CRM, pipeline and integrations</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PlanStatusBadge />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <PlanGate>
              <AppRouter />
            </PlanGate>
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

  const primaryDomain = normalizePrimaryDomain(
    import.meta.env.VITE_PRIMARY_DOMAIN as string | undefined,
  );
  const isAppHost =
    !!primaryDomain && window.location.hostname === `app.${primaryDomain}`;

  // The app subdomain never renders marketing/login pages — bounce logged-out
  // visitors back to the root domain's login instead (the admin one for
  // /admin URLs).
  useEffect(() => {
    if (isLoading || user || !isAppHost) return;
    window.location.href = `https://${primaryDomain}${isAdminPath(location) ? "/admin-login" : "/login"}`;
  }, [isLoading, user, isAppHost, primaryDomain, location]);

  // Any authenticated view (dashboard, settings, admin, ...) belongs on the
  // app subdomain. A logged-in user can still land on the root domain via
  // the back button, a bookmark, or typing the bare URL — same-origin
  // client routing can't move them to a different host, so this has to be
  // a real navigation.
  const needsAppHostRedirect =
    !!user && !!primaryDomain && !isAppHost && !PUBLIC_CONTENT_PATHS.has(location);

  useEffect(() => {
    if (isLoading || !user) return;

    const onAuthPage = location === "/" || location === "/login" || location === "/admin-login";
    // Where a just-signed-in user was heading (e.g. /billing?plan=growth from Pricing).
    const next = location === "/login" ? nextFromSearch(window.location.search) : null;

    if (needsAppHostRedirect) {
      const dest =
        user.role === "super_admin"
          ? isAdminRoute
            ? `${location}${window.location.search}`
            : "/admin"
          : next ?? (onAuthPage ? "/dashboard" : `${location}${window.location.search}`);
      window.location.href = `https://app.${primaryDomain}${dest}`;
      return;
    }

    if (user.role === "super_admin") {
      if (!isAdminRoute) {
        setLocation("/admin");
      }
      return;
    }

    if (onAuthPage) {
      setLocation(next ?? "/dashboard");
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
