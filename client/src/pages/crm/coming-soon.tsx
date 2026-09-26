import { Link } from "wouter";
import { BarChart3, Check, Workflow, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/crm/crm-ui";

/**
 * Honest placeholder for CRM modules that aren't built yet: says so plainly,
 * lists what's planned, and points to what already works.
 */
function ComingSoon({
  icon: Icon,
  title,
  summary,
  planned,
  meanwhile,
}: {
  icon: LucideIcon;
  title: string;
  summary: string;
  planned: string[];
  meanwhile: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
          <ComingSoonBadge />
        </div>
        <p className="mt-2 text-muted-foreground">{summary}</p>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planned</p>
        <ul className="mt-2 space-y-2">
          {planned.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={meanwhile.href}>{meanwhile.label}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Tell us what you need</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AutomationPage() {
  return (
    <ComingSoon
      icon={Workflow}
      title="Automation"
      summary="Rules that assign leads, send first replies and create follow-ups for you are not available yet."
      planned={[
        "Auto-assign new leads by source or round-robin",
        "Automatic follow-up tasks when a lead or deal changes stage",
        "WhatsApp welcome message for new leads (using approved templates)",
        "AI-suggested next actions and reply drafts",
      ]}
      meanwhile={{ href: "/follow-ups", label: "Schedule follow-ups manually" }}
    />
  );
}

export function ReportsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Reports"
      summary="Detailed CRM reports aren't available yet. Your dashboard already shows live lead, deal, pipeline and revenue numbers."
      planned={[
        "Lead sources and conversion rate by source",
        "Pipeline velocity and win rate by stage",
        "Revenue by month and by team member",
        "Export to CSV",
      ]}
      meanwhile={{ href: "/dashboard", label: "Open your dashboard" }}
    />
  );
}
