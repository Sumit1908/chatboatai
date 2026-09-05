import type { LucideIcon } from "lucide-react";
import {
  Shield,
  Lock,
  BadgeCheck,
  CreditCard,
  FileCheck2,
  UserCheck,
  Headphones,
  Ban,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { cn } from "@/lib/utils";

export type TrustBadgeItem = {
  icon: LucideIcon | "whatsapp";
  label: string;
  sublabel: string;
};

/** Honest trust signals — only claims the product actually supports */
export const TRUST_BADGES: TrustBadgeItem[] = [
  {
    icon: "whatsapp",
    label: "Official Meta API",
    sublabel: "WhatsApp Cloud API",
  },
  {
    icon: BadgeCheck,
    label: "Verified Business",
    sublabel: "Meta Business profile",
  },
  {
    icon: Ban,
    label: "No grey tools",
    sublabel: "Zero unofficial clients",
  },
  {
    icon: Lock,
    label: "Encrypted access",
    sublabel: "HTTPS · secure sessions",
  },
  {
    icon: CreditCard,
    label: "Secure payments",
    sublabel: "Razorpay checkout",
  },
  {
    icon: FileCheck2,
    label: "GST invoices",
    sublabel: "India-ready billing",
  },
  {
    icon: UserCheck,
    label: "Opt-in messaging",
    sublabel: "Compliant audiences",
  },
  {
    icon: Headphones,
    label: "Human support",
    sublabel: "Call & WhatsApp help",
  },
];

function BadgeIcon({
  icon,
  className,
}: {
  icon: TrustBadgeItem["icon"];
  className?: string;
}) {
  if (icon === "whatsapp") {
    return <FaWhatsapp className={className} />;
  }
  const Icon = icon;
  return <Icon className={className} />;
}

function chunkStaggeredRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  let index = 0;
  let rowSize = 1;
  while (index < items.length) {
    rows.push(items.slice(index, index + rowSize));
    index += rowSize;
    rowSize = rowSize === 1 ? 2 : 1;
  }
  return rows;
}

function TrustBadgeChip({
  badge: b,
  variant,
  compact,
  isDark,
  className,
}: {
  badge: TrustBadgeItem;
  variant: "light" | "dark" | "onGreen";
  compact: boolean;
  isDark: boolean;
  className?: string;
}) {
  return (
    <div
      role="listitem"
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200",
        compact ? "min-w-[140px]" : "min-w-[148px] sm:min-w-[160px]",
        variant === "light" &&
          "border-[#075E54]/12 bg-white/90 shadow-sm shadow-[#075E54]/6 hover:border-[#25D366]/45 hover:shadow-md hover:shadow-[#25D366]/10",
        variant === "dark" &&
          "border-white/15 bg-white/5 backdrop-blur-sm hover:border-[#25D366]/50 hover:bg-white/10",
        variant === "onGreen" &&
          "border-white/20 bg-black/15 backdrop-blur-sm hover:bg-black/25",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          variant === "light" && "bg-[#25D366]/12 text-[#128C7E] ring-1 ring-[#25D366]/25",
          isDark && "bg-[#25D366]/20 text-[#25D366] ring-1 ring-[#25D366]/35",
        )}
      >
        <BadgeIcon icon={b.icon} className="h-[18px] w-[18px]" />
        <Shield
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5",
            variant === "light" ? "text-[#075E54]/35 fill-white" : "text-[#25D366]/70 fill-[#042f2a]",
          )}
          strokeWidth={2.5}
        />
      </div>
      <div className="min-w-0 text-left leading-tight">
        <p
          className={cn(
            "text-[12px] sm:text-[13px] font-semibold tracking-tight",
            variant === "light" ? "text-[#075E54]" : "text-white",
          )}
        >
          {b.label}
        </p>
        <p
          className={cn(
            "text-[10px] sm:text-[11px] mt-0.5",
            variant === "light" ? "text-[#075E54]/50" : "text-white/55",
          )}
        >
          {b.sublabel}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact seal-style badges for hero / pricing / CTAs.
 * Designed to read as institutional trust, not decorative chips.
 */
export function TrustBadgeRow({
  badges = TRUST_BADGES,
  variant = "light",
  className,
  compact = false,
}: {
  badges?: TrustBadgeItem[];
  variant?: "light" | "dark" | "onGreen";
  className?: string;
  compact?: boolean;
}) {
  const isDark = variant === "dark" || variant === "onGreen";
  const mobileRows = chunkStaggeredRows(badges);

  return (
    <>
      {/* Mobile: 1 → 2 → 1 → 2 staggered rows */}
      <div
        className={cn("flex sm:hidden flex-col items-center gap-2.5 w-full", className)}
        role="list"
        aria-label="Trust and security badges"
      >
        {mobileRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "flex w-full gap-2",
              row.length === 1 ? "justify-center" : "justify-center px-1",
            )}
          >
            {row.map((b) => (
              <TrustBadgeChip
                key={b.label}
                badge={b}
                variant={variant}
                compact={compact}
                isDark={isDark}
                className={cn(
                  row.length === 1
                    ? "w-full max-w-[280px] min-w-0"
                    : "flex-1 min-w-0 max-w-[calc(50%-4px)]",
                  !compact && row.length === 2 && "min-w-0",
                )}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: unchanged flex-wrap */}
      <div
        className={cn(
          "hidden sm:flex flex-wrap items-stretch justify-center gap-2.5 sm:gap-3",
          className,
        )}
        role="list"
        aria-label="Trust and security badges"
      >
        {badges.map((b) => (
          <TrustBadgeChip
            key={b.label}
            badge={b}
            variant={variant}
            compact={compact}
            isDark={isDark}
          />
        ))}
      </div>
    </>
  );
}

/** Section label + compact trust badges — matches hero "Why teams trust Sampark" */
export function TrustBadgeSection({
  title = "Why teams trust Sampark",
  badges,
  variant = "light",
  className,
  rowClassName,
}: {
  title?: string;
  badges?: TrustBadgeItem[];
  variant?: "light" | "dark" | "onGreen";
  className?: string;
  rowClassName?: string;
}) {
  return (
    <div
      className={cn(
        "pt-6 border-t",
        variant === "light" ? "border-[#075E54]/10" : "border-white/10",
        className,
      )}
    >
      <p
        className={cn(
          "text-[11px] uppercase tracking-wider font-semibold mb-3",
          variant === "light" ? "text-[#075E54]/40" : "text-white/40",
        )}
      >
        {title}
      </p>
      <TrustBadgeRow
        compact
        badges={badges}
        variant={variant}
        className={cn("justify-center sm:justify-start", rowClassName)}
      />
    </div>
  );
}

/** Full-width trust bar with headline — for mid-page / below hero */
export function TrustBadgeBanner({
  variant = "light",
  className,
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-6 sm:px-8 sm:py-7",
        variant === "light"
          ? "border-[#075E54]/10 bg-gradient-to-b from-white to-[#F7FBF8] shadow-[0_12px_40px_-20px_rgba(7,94,84,0.18)]"
          : "border-white/10 bg-white/5",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              variant === "light" ? "bg-[#25D366]/15 text-[#128C7E]" : "bg-[#25D366]/20 text-[#25D366]",
            )}
          >
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p
              className={cn(
                "font-heading font-bold text-sm sm:text-base",
                variant === "light" ? "text-[#075E54]" : "text-white",
              )}
            >
              Trusted by teams who can&apos;t risk a ban
            </p>
            <p
              className={cn(
                "text-xs mt-0.5",
                variant === "light" ? "text-[#075E54]/50" : "text-white/55",
              )}
            >
              Official stack · transparent delivery · secure checkout
            </p>
          </div>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start self-stretch sm:self-auto rounded-full px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold text-center sm:text-left",
            variant === "light"
              ? "bg-[#25D366]/12 text-[#075E54] ring-1 ring-[#25D366]/25"
              : "bg-[#25D366]/20 text-[#25D366] ring-1 ring-[#25D366]/30",
          )}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Verified WhatsApp Business stack
        </div>
      </div>
      <TrustBadgeRow variant={variant} />
    </div>
  );
}
