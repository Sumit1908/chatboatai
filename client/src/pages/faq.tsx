import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeIn } from "@/components/marketing-layout";
import { Band, MarketingPage } from "@/components/crm/marketing-kit";
import { faqs } from "@/lib/marketing-content";

const GROUPS = [
  { key: "general", title: "About ChatBoatAI" },
  { key: "whatsapp", title: "WhatsApp integration" },
  { key: "billing", title: "Plans & billing" },
] as const;

export default function FaqPage() {
  return (
    <MarketingPage
      eyebrow="FAQ"
      title="Questions, answered"
      subtitle="What ChatBoatAI does today, what's coming next, and how the WhatsApp integration and billing work."
    >
      <Band tinted>
        <div className="mx-auto max-w-3xl space-y-12">
          {GROUPS.map((group) => {
            const items = faqs.filter((f) => f.category === group.key);
            if (items.length === 0) return null;
            return (
              <FadeIn key={group.key}>
                <section>
                  <h2 className="mb-4 font-heading text-xl font-bold text-[#04322E]">{group.title}</h2>
                  <Accordion type="multiple" className="space-y-3">
                    {items.map((item) => (
                      <AccordionItem key={item.q} value={item.q} className="rounded-xl border border-[#04322E]/10 bg-[#F4FBF9] px-5">
                        <AccordionTrigger className="text-left font-heading text-[15px] font-semibold text-[#04322E] hover:no-underline">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm leading-relaxed text-[#04322E]/65">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              </FadeIn>
            );
          })}
          <div className="rounded-2xl border border-[#04322E]/10 bg-[#F4FBF9] p-6 text-center">
            <p className="font-heading font-semibold text-[#04322E]">Still have questions?</p>
            <p className="mt-1 text-sm text-[#04322E]/60">Call or email us — details are on the contact page.</p>
            <Link
              href="/contact"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0E8C7F] transition-colors hover:text-[#04322E]"
            >
              Contact us <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </Band>
    </MarketingPage>
  );
}
