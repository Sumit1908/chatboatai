import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CreditCard,
  Eye,
  LayoutDashboard,
  ScrollText,
  LogOut,
  FileText,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export type AdminTab =
  | "dashboard"
  | "visitors"
  | "users"
  | "plans"
  | "revenue"
  | "payments"
  | "files"
  | "audit";

const ADMIN_TABS: AdminTab[] = [
  "dashboard",
  "visitors",
  "users",
  "plans",
  "revenue",
  "payments",
  "files",
  "audit",
];

export function parseAdminTab(value: string | null): AdminTab {
  if (value && ADMIN_TABS.includes(value as AdminTab)) {
    return value as AdminTab;
  }
  return "dashboard";
}

interface AdminStats {
  pendingApproval: number;
}

interface VisitorAnalytics {
  visitors24h: number;
}

type NavItem = {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

interface AdminLayoutProps {
  activeTab: AdminTab;
  onTabSelect: (tab: AdminTab) => void;
  children: ReactNode;
}

export function AdminLayout({ activeTab, onTabSelect, children }: AdminLayoutProps) {
  const { logout, isLoggingOut } = useAuth();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: visitors } = useQuery<VisitorAnalytics>({
    queryKey: ["/api/admin/visitors"],
  });

  const pendingApproval = stats?.pendingApproval ?? 0;

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "visitors", label: "Visitors", icon: Eye, badge: visitors?.visitors24h },
    { id: "users", label: "User management", icon: Users, badge: pendingApproval || undefined },
    { id: "plans", label: "Billing plans", icon: CreditCard },
    { id: "revenue", label: "Subscriptions & Revenue", icon: BarChart3 },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "files", label: "Uploaded files", icon: FileText },
    { id: "audit", label: "Audit log", icon: ScrollText },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7FAFF]">
      <aside className="w-60 shrink-0 h-screen bg-white border-r border-[#14205a]/10 text-[#14205a] flex flex-col py-5 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 pb-5 shrink-0">
          <div className="relative h-8 w-8 shrink-0">
            <div className="absolute inset-0 translate-x-[-3px] translate-y-[3px] rounded-lg bg-cyan-400" />
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#14205a] font-heading text-base font-bold text-white">
              c
            </div>
          </div>
          <div>
            <div className="font-heading font-bold text-[15px]">
              ChatBoatAI
            </div>
            <div className="text-[10px] tracking-widest uppercase text-[#14205a]/45">
              Admin panel
            </div>
          </div>
        </div>
        <div className="px-5 pb-2 text-[10px] tracking-widest uppercase text-[#14205a]/40 shrink-0">
          Menu
        </div>
        <nav className="flex flex-col gap-0.5 px-3 flex-1 min-h-0 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabSelect(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-200",
                activeTab === item.id
                  ? "bg-cyan-500/15 text-[#14205a] font-semibold"
                  : "text-[#14205a]/70 hover:bg-[#14205a]/5 hover:text-[#14205a]",
              )}
              data-testid={`admin-nav-${item.id}`}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  activeTab === item.id ? "text-cyan-600" : "text-[#14205a]/50",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="bg-cyan-500 text-[#0B1030] rounded-full text-[11px] font-bold px-1.5 min-w-5 text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="shrink-0 px-5 pt-3.5 border-t border-[#14205a]/10 mx-3.5">
          <div className="flex items-center gap-2 text-xs text-[#14205a]/50">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            Live &middot; refreshes 30s
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-cyan-500 text-[#0B1030] flex items-center justify-center font-bold text-xs">
                SA
              </div>
              <div className="text-xs font-medium">Admin</div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors"
            >
              <LogOut className="h-3 w-3" /> {isLoggingOut ? "…" : "Log out"}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 h-screen overflow-y-auto p-6 space-y-6 bg-[#F7FAFF]">
        {children}
      </div>
    </div>
  );
}
