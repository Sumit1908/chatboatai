import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { faqs } from "@/lib/marketing-content";

const gettingStartedFaqs = faqs.slice(0, 3);
const billingFaqs = faqs.slice(3);

export default function FaqPage() {
  return (
    <MarketingLayout>
      <AnimatedSection variant="soft" intensity="subtle" className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <PageHero
            eyebrow="FAQ"
            title="Questions, answered"
            subtitle="Everything you need to know about ChatBoatAI, the official WhatsApp Business API, and getting started."
            centered
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="inbox" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-xl font-heading font-bold text-[#075E54] mb-6">All questions</h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="border border-[#075E54]/10 rounded-xl bg-white/80 px-4 sm:px-6 mb-3 last:mb-0"
                >
                  <AccordionTrigger className="text-left font-heading font-semibold text-[#075E54] hover:no-underline py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#075E54]/55 text-sm leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="messages" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10 bg-[#ECE5DD]/40">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-xl font-heading font-bold text-[#075E54] mb-6">Getting started</h2>
          </FadeIn>
          <div className="space-y-4">
            {gettingStartedFaqs.map((item, i) => (
              <FadeIn key={item.q} delay={i * 0.08}>
                <div className="p-5 rounded-xl border border-[#075E54]/10 bg-white/90">
                  <h3 className="font-semibold text-[#075E54] mb-2">{item.q}</h3>
                  <p className="text-sm text-[#075E54]/60 leading-relaxed">{item.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.2} className="mt-8 text-center">
            <Link href="/setup-guide">
              <Button variant="outline" className="gap-2 border-[#075E54]/20 text-[#075E54]">
                Read the setup guide <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="ticks" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-xl font-heading font-bold text-[#075E54] mb-6">Templates & billing</h2>
          </FadeIn>
          <div className="space-y-4">
            {billingFaqs.map((item, i) => (
              <FadeIn key={item.q} delay={i * 0.08}>
                <div className="p-5 rounded-xl border border-[#075E54]/10 bg-white/80">
                  <h3 className="font-semibold text-[#075E54] mb-2">{item.q}</h3>
                  <p className="text-sm text-[#075E54]/60 leading-relaxed">{item.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="typing" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="text-xl font-heading font-bold text-[#075E54] mb-4">Still have questions?</h2>
            <p className="text-[#075E54]/55 mb-8">
              Reach us on WhatsApp or call during business hours — real humans, not bots.
            </p>
            <Link href="/contact">
              <Button className="bg-[#075E54] hover:bg-[#0a6b5f] text-white gap-2">
                Contact us <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="broadcast" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <MarketingCta />
          </FadeIn>
        </div>
      </AnimatedSection>
    </MarketingLayout>
  );
}
