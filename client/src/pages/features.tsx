import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { CRM_MODULES } from "@/lib/marketing-content";
import {
  AiLayerSection,
  Band,
  IntegrationsGrid,
  MarketingPage,
  ModuleGrid,
  SectionHeading,
  WhatsAppSection,
} from "@/components/crm/marketing-kit";

export default function FeaturesPage() {
  const live = CRM_MODULES.filter((m) => m.status === "live");
  const soon = CRM_MODULES.filter((m) => m.status === "soon");

  return (
    <MarketingPage
      eyebrow="Features"
      title="One CRM for leads, deals and follow-ups"
      subtitle="Capture enquiries, work your pipeline and keep every follow-up on track — with WhatsApp and your other tools connected to the same dashboard."
    >
      <Band tinted>
        <SectionHeading
          eyebrow="Available today"
          title="The CRM your team works in every day"
          subtitle="Everything below is live in the app now."
        />
        <ModuleGrid detailed modules={live} />
      </Band>

      <Band>
        <SectionHeading
          eyebrow="On the roadmap"
          title="Coming soon"
          subtitle="Planned modules we're building next. They're not available yet."
        />
        <ModuleGrid detailed modules={soon} />
      </Band>

      <AiLayerSection />

      <WhatsAppSection className="border-y border-[#04322E]/10 bg-white" />

      <Band>
        <SectionHeading
          eyebrow="Integrations"
          title="Connected to the tools you already use"
          subtitle="WhatsApp is live. The rest are on our roadmap."
        />
        <IntegrationsGrid />
        <div className="mt-6 text-center">
          <Link
            href="/integrations"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0E8C7F] transition-colors hover:text-[#04322E]"
          >
            See all integrations <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Band>
    </MarketingPage>
  );
}
