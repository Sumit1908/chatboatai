import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Send,
  CheckCircle,
  Eye,
  XCircle,
  FileCheck,
  FileX,
  Play,
  Flag,
  Activity,
  Sparkles,
} from "lucide-react";
import type { ActivityItem } from "@shared/schema";

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
  maxHeight?: string;
}

const activityConfig: Record<string, { icon: typeof Send; color: string; bg: string; ring: string }> = {
  message_sent: { icon: Send, color: "text-[#34B7F1]", bg: "bg-[#34B7F1]/10", ring: "ring-[#34B7F1]/20" },
  message_delivered: { icon: CheckCircle, color: "text-[#25D366]", bg: "bg-[#25D366]/10", ring: "ring-[#25D366]/20" },
  message_read: { icon: Eye, color: "text-[#128C7E]", bg: "bg-[#128C7E]/10", ring: "ring-[#128C7E]/20" },
  message_failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", ring: "ring-red-500/20" },
  template_approved: { icon: FileCheck, color: "text-[#25D366]", bg: "bg-[#25D366]/10", ring: "ring-[#25D366]/20" },
  template_rejected: { icon: FileX, color: "text-red-500", bg: "bg-red-500/10", ring: "ring-red-500/20" },
  campaign_started: { icon: Play, color: "text-[#25D366]", bg: "bg-[#25D366]/10", ring: "ring-[#25D366]/20" },
  campaign_completed: { icon: Flag, color: "text-[#128C7E]", bg: "bg-[#128C7E]/10", ring: "ring-[#128C7E]/20" },
  notification_completed: { icon: Send, color: "text-[#25D366]", bg: "bg-[#25D366]/10", ring: "ring-[#25D366]/20" },
  notification_sent: { icon: Send, color: "text-[#34B7F1]", bg: "bg-[#34B7F1]/10", ring: "ring-[#34B7F1]/20" },
  notification_failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", ring: "ring-red-500/20" },
};

const defaultActivityConfig = {
  icon: Flag,
  color: "text-muted-foreground",
  bg: "bg-muted",
  ring: "ring-muted",
};

export function ActivityFeed({ activities, className, maxHeight = "h-96" }: ActivityFeedProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b border-[#075E54]/6 bg-gradient-to-r from-white via-white to-[rgba(220,248,198,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/12 text-[#25D366] shadow-sm">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[#075E54]">Recent Activity</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Live feed from your workspace</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/20 bg-[#25D366]/8 px-2.5 py-1 text-[11px] font-medium text-[#128C7E]">
            <Sparkles className="h-3 w-3" />
            {activities.length} events
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={maxHeight}>
          <div className="relative px-5 py-5">
            {activities.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]/8 text-[#25D366]">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#075E54]">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">Events will appear here as you send messages</p>
                </div>
              </div>
            ) : (
              <div className="relative space-y-0">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#25D366]/40 via-[#128C7E]/20 to-transparent" />

                {activities.map((activity, index) => {
                  const config = activityConfig[activity.type] || defaultActivityConfig;
                  const Icon = config.icon;

                  return (
                    <div
                      key={activity.id}
                      className="relative flex gap-3.5 group py-3 first:pt-0 last:pb-0"
                      data-testid={`activity-item-${activity.id}`}
                    >
                      <div
                        className={cn(
                          "relative z-10 shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ring-2 ring-white shadow-sm transition-transform duration-200 group-hover:scale-105",
                          config.bg,
                          config.ring,
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0 rounded-2xl border border-transparent px-3 py-2.5 pt-0 transition-all duration-200 group-hover:border-[#075E54]/8 group-hover:bg-[#F7FBF8]/90 group-hover:shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight text-[#075E54]">
                            {activity.title}
                          </p>
                          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/80">
                            {activity.timestamp
                              ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
                              : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                        {index === 0 && (
                          <span className="mt-2 inline-flex items-center rounded-full bg-[#25D366]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#128C7E]">
                            Latest
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
