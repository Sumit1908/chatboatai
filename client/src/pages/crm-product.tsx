import { ArrowRight, CalendarClock, Handshake, KanbanSquare, Trophy, UserPlus } from "lucide-react";
import { FadeIn } from "@/components/marketing-layout";
import { BrandMark, INTEGRATIONS, IntegrationIcon } from "@/components/crm/brand";
import {
  AiLayerSection,
  Band,
  MarketingPage,
  ModuleGrid,
  SectionHeading,
  StatusChip,
} from "@/components/crm/marketing-kit";
import { CRM_MODULES } from "@/lib/marketing-content";

const FLOW = [
  { icon: UserPlus, title: "Lead captured", desc: "An enquiry arrives from your website, a call, an ad or WhatsApp." },
  { icon: CalendarClock, title: "Follow-up scheduled", desc: "A call or meeting is booked against the lead." },
  { icon: Handshake, title: "Converted to a deal", desc: "Qualified leads become deals with a value in rupees." },
  { icon: KanbanSquare, title: "Moved through the pipeline", desc: "Contacted → Proposal → Negotiation." },
  { icon: Trophy, title: "Closed won", desc: "Revenue lands on your dashboard for the month." },
];

/** The product structure as a tree: CRM modules + integrations, with real status. */
function ProductTree() {
  const branch = "relative pl-6 before:absolute before:left-0 before:top-0 before:h-full before:border-l before:border-[#14B8A6]/30";
  const node =
    "relative flex items-center justify-between gap-3 rounded-xl border border-[#04322E]/10 bg-white px-4 py-2.5 before:absolute before:-left-6 before:top-1/2 before:w-6 before:border-t before:border-[#14B8A6]/30";
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <FadeIn>
        <div>
          <div className="mb-3 flex items-center gap-3">
            <BrandMark className="h-9 w-9" />
            <p className="font-heading text-lg font-bold text-[#04322E]">CRM</p>
          </div>
          <ul className={`${branch} space-y-2`}>
            {CRM_MODULES.map((m) => (
              <li key={m.id} className={node}>
                <span className="flex items-center gap-2.5 text-sm font-medium text-[#04322E]">
                  <m.icon className="h-4 w-4 text-[#0E8C7F]" aria-hidden />
                  {m.name}
                </span>
                <StatusChip status={m.status} />
              </li>
            ))}
          </ul>
        </div>
      </FadeIn>
      <FadeIn delay={0.08}>
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 font-heading text-lg font-bold text-[#0E8C7F] ring-1 ring-teal-100">
              +
            </span>
            <p className="font-heading text-lg font-bold text-[#04322E]">Integrations</p>
          </div>
          <ul className={`${branch} space-y-2`}>
            {INTEGRATIONS.filter((i) => i.id !== "forms").map((i) => (
              <li key={i.id} className={node}>
                <span className="flex items-center gap-2.5 text-sm font-medium text-[#04322E]">
                  <IntegrationIcon integration={i} className="h-6 w-6" />
                  {i.name}
                </span>
                <StatusChip status={i.status === "live" ? "live" : "soon"} />
              </li>
            ))}
          </ul>
        </div>
      </FadeIn>
    </div>
  );
}

export default function CrmProductPage() {
  return (
    <MarketingPage
      eyebrow="CRM"
      title="The CRM at the center of your business"
      subtitle="Leads, contacts, deals, pipeline, follow-ups and tasks share one record of every customer — and your channels feed into it."
    >
      <Band tinted>
        <SectionHeading
          eyebrow="How it fits together"
          title="One CRM, every tool connected"
          subtitle="What's live today and what's coming next — the same labels you'll see inside the app."
        />
        <ProductTree />
      </Band>

      <Band>
        <SectionHeading eyebrow="From lead to revenue" title="How a lead moves through ChatBoatAI" />
        <ol className="grid gap-4 md:grid-cols-5">
          {FLOW.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.06}>
              <li className="relative h-full rounded-2xl border border-[#04322E]/10 bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#0E8C7F] ring-1 ring-teal-100">
                  <step.icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-3 font-heading font-semibold text-[#04322E]">{step.title}</p>
                <p className="mt-1 text-sm text-[#04322E]/60">{step.desc}</p>
                {i < FLOW.length - 1 && (
                  <ArrowRight
                    className="absolute -right-3.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-[#14B8A6] md:block"
                    aria-hidden
                  />
                )}
              </li>
            </FadeIn>
          ))}
        </ol>
      </Band>

      <Band tinted>
        <SectionHeading eyebrow="Modules" title="What each part of the CRM does" />
        <ModuleGrid detailed />
      </Band>

      <AiLayerSection />
    </MarketingPage>
  );
}
