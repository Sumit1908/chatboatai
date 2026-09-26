import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CrmIntegrationStatus } from "@shared/crm";
import { INTEGRATIONS, IntegrationIcon } from "@/components/crm/brand";
import { ComingSoonBadge, CrmPageHeader, QueryError } from "@/components/crm/crm-ui";

/** In-app Integrations page. Status comes from the API - only WhatsApp is real today. */
export default function ConnectedAppsPage() {
  const { data, isLoading, error } = useQuery<{ integrations: CrmIntegrationStatus[] }>({
    queryKey: ["/api/crm/integrations"],
  });

  return (
    <div className="mx-auto max-w-6xl">
      <CrmPageHeader
        title="Integrations"
        description="Channels and tools that feed your CRM. WhatsApp is available today; the rest are on our roadmap."
      />
      {error ? (
        <QueryError error={error} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.integrations ?? []).map((integration) => {
            const meta = INTEGRATIONS.find((i) => i.id === integration.id);
            const isWhatsApp = integration.id === "whatsapp";
            return (
              <div
                key={integration.id}
                className={`flex flex-col rounded-xl border bg-card p-5 shadow-sm ${
                  integration.status === "coming_soon" ? "opacity-80" : ""
                }`}
                data-testid={`integration-${integration.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  {meta && (
                    <IntegrationIcon integration={meta} className="h-11 w-11 rounded-xl bg-muted/50" iconClassName="h-6 w-6" />
                  )}
                  {integration.status === "connected" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Connected
                    </span>
                  ) : integration.status === "available" ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                      Available
                    </span>
                  ) : (
                    <ComingSoonBadge />
                  )}
                </div>
                <p className="mt-4 font-heading font-semibold text-foreground">{integration.name}</p>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{meta?.description ?? integration.detail}</p>
                {/* Roadmap cards already carry the "Coming soon" badge. */}
                {integration.status !== "coming_soon" && (
                  <p className="mt-2 text-xs text-muted-foreground">{integration.detail}</p>
                )}
                {isWhatsApp && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {integration.status === "connected" ? (
                      <Button asChild size="sm">
                        <Link href="/whatsapp">
                          Open WhatsApp <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm">
                        <Link href="/settings">
                          Connect WhatsApp <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href="/settings">Manage numbers</Link>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
