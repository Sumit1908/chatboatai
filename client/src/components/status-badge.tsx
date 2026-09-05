import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TemplateStatus, MessageStatus, CampaignStatus, QualityScore } from "@shared/schema";
import { CheckCircle, Clock, XCircle, AlertTriangle, Pause, Send, Eye, FileEdit } from "lucide-react";

interface StatusBadgeProps {
  status: TemplateStatus | MessageStatus | CampaignStatus | QualityScore | string;
  type?: "template" | "message" | "campaign" | "quality";
  showIcon?: boolean;
  size?: "sm" | "default";
  pulse?: boolean;
  className?: string;
}

const statusConfig = {
  // Template statuses
  DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground border-muted", icon: FileEdit },
  PENDING: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-accent text-accent-foreground border-accent", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: XCircle },
  DISABLED: { label: "Disabled", color: "bg-muted text-muted-foreground border-muted", icon: AlertTriangle },
  PAUSED: { label: "Paused", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", icon: Pause },
  
  // Message statuses
  queued: { label: "Queued", color: "bg-muted text-muted-foreground border-muted", icon: Clock },
  sent: { label: "Sent", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: Send },
  delivered: { label: "Delivered", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", icon: CheckCircle },
  read: { label: "Read", color: "bg-primary/10 text-primary border-primary/20", icon: Eye },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: XCircle },
  
  // Campaign statuses
  draft: { label: "Draft", color: "bg-muted text-muted-foreground border-muted", icon: Clock },
  scheduled: { label: "Scheduled", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: Clock },
  running: { label: "Running", color: "bg-primary/10 text-primary border-primary/20", icon: Send },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", icon: CheckCircle },
  paused: { label: "Paused", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", icon: Pause },
  
  // Quality scores
  GREEN: { label: "High", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", icon: CheckCircle },
  YELLOW: { label: "Medium", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", icon: AlertTriangle },
  RED: { label: "Low", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: XCircle },
  UNKNOWN: { label: "Unknown", color: "bg-muted text-muted-foreground border-muted", icon: Clock },
};

export function StatusBadge({ status, showIcon = true, size = "default", pulse = false, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig];
  
  if (!config) {
    return null;
  }

  const Icon = config.icon;
  const isPending = status === "PENDING" || status === "queued" || status === "scheduled" || status === "running";

  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium gap-1.5",
        config.color,
        size === "sm" && "text-xs px-1.5 py-0.5 h-5",
        (pulse && isPending) && "animate-pulse",
        className
      )}
    >
      {showIcon && <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}
