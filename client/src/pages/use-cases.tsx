import { Check } from "lucide-react";
import { FadeIn } from "@/components/marketing-layout";
import { Band, MarketingPage, SectionHeading, WhatsAppSection } from "@/components/crm/marketing-kit";
import { useCases } from "@/lib/marketing-content";

const moreUseCases = [
  {
    title: "Clinics & wellness",
    desc: "Track new-patient enquiries as leads, schedule callback follow-ups, and send appointment updates over WhatsApp.",
  },
  {
    title: "Financial & insurance advisors",
    desc: "Keep each prospect's policy or loan opportunity as a deal, and never miss a renewal follow-up.",
  },
  {
    title: "B2B sales teams",
    desc: "Run a clean pipeline from first meeting to signed order, with every follow-up visible on one dashboard.",
  },
  {
    title: "Events & hospitality",
    desc: "Capture booking enquiries, follow up on quotes, and confirm bookings with WhatsApp messages.",
  },
];

export default function UseCasesPage() {
  return (
    <MarketingPage
      eyebrow="Use cases"
      title="Built for teams that sell every day"
      subtitle="Adapt ChatBoatAI's leads, pipeline and follow-ups to the way your business works — and message customers on WhatsApp from the same place."
    >
      <Band tinted>
        <SectionHeading eyebrow="By industry" title="How teams use ChatBoatAI" />
        <div className="grid gap-5 md:grid-cols-2">
          {useCases.map((c, i) => (
            <FadeIn key={c.title} delay={(i % 2) * 0.08}>
              <div className="h-full rounded-2xl border border-[#04322E]/10 bg-[#F4FBF9] p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_40px_-20px_rgba(4,50,46,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0E8C7F]">{c.tag}</p>
                <h3 className="mt-2 font-heading text-xl font-semibold text-[#04322E]">{c.title}</h3>
                <p className="mt-1 text-sm text-[#04322E]/60">{c.desc}</p>
                <ul className="mt-4 space-y-2">
                  {c.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#04322E]/75">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#14B8A6]" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </Band>

      <Band>
        <SectionHeading eyebrow="More ideas" title="Anywhere you follow up with customers" />
        <div className="grid gap-5 sm:grid-cols-2">
          {moreUseCases.map((c, i) => (
            <FadeIn key={c.title} delay={(i % 2) * 0.08}>
              <div className="h-full rounded-2xl border border-[#04322E]/10 bg-white p-6">
                <h3 className="font-heading font-semibold text-[#04322E]">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#04322E]/60">{c.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Band>

      <WhatsAppSection className="border-t border-[#04322E]/10 bg-white" />
    </MarketingPage>
  );
}
