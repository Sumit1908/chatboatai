import { Check } from "lucide-react";
import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { useCases } from "@/lib/marketing-content";

const industryStats = [
  { value: "90%+", label: "avg delivery on opted-in lists" },
  { value: "40%", label: "typical read rate" },
  { value: "3×", label: "faster follow-up vs email" },
];

const extraUseCases = [
  {
    title: "Education & coaching",
    desc: "Course launches, webinar reminders, and fee payment nudges — where students actually respond.",
  },
  {
    title: "Healthcare & clinics",
    desc: "Appointment confirmations, report ready alerts, and follow-up care messages with utility templates.",
  },
];

export default function UseCasesPage() {
  return (
    <MarketingLayout>
      <AnimatedSection variant="messages" intensity="bold" className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <PageHero
            eyebrow="Who it's for"
            title="Built for teams that sell in conversations"
            subtitle="WhatsApp is where Indian buyers actually respond. ChatBoatAI turns those conversations into a pipeline."
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="soft" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-[#075E54] mb-10 text-center">
              Industries we serve
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {useCases.map((c, i) => (
              <FadeIn key={c.title} delay={i * 0.1}>
                <div className="h-full p-6 rounded-xl border border-[#075E54]/10 bg-gradient-to-b from-white to-[#F7FBF8]">
                  <span className="inline-block text-xs font-medium uppercase tracking-wide text-[#128C7E] bg-[#25D366]/12 border border-[#25D366]/25 rounded-full px-3 py-1 mb-4">
                    {c.tag}
                  </span>
                  <h3 className="font-semibold text-lg mb-1.5 text-[#075E54]">{c.title}</h3>
                  <p className="text-[#075E54]/55 text-sm leading-relaxed mb-4">{c.desc}</p>
                  <ul className="space-y-2">
                    {c.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-[#075E54]/65">
                        <Check className="h-4 w-4 text-[#25D366] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="bubbles" intensity="bold" className="py-16 md:py-20 px-4 bg-[#ECE5DD]/50">
        <div className="container mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-10 text-center">More use cases</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-5">
            {extraUseCases.map((c, i) => (
              <FadeIn key={c.title} delay={i * 0.1}>
                <div className="p-6 rounded-xl border border-[#25D366]/25 bg-white/90 shadow-sm">
                  <h3 className="font-semibold text-[#075E54] mb-2">{c.title}</h3>
                  <p className="text-sm text-[#075E54]/60 leading-relaxed">{c.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="wave" intensity="subtle" dark className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-white mb-10 text-center">Why WhatsApp works</h2>
          </FadeIn>
          <div className="flex flex-wrap justify-center gap-10">
            {industryStats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="text-center">
                  <p className="text-3xl font-heading font-bold text-[#25D366]">{s.value}</p>
                  <p className="text-xs uppercase tracking-wide text-white/50 mt-1">{s.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="particles" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-4 text-center">
              One platform, every conversation
            </h2>
            <p className="text-center text-[#075E54]/55 max-w-2xl mx-auto">
              Whether you&apos;re a broker blasting new launches or a D2C brand recovering carts, ChatBoatAI gives you
              broadcasts, inbox, and analytics on the official Meta API.
            </p>
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="spark" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <MarketingCta />
          </FadeIn>
        </div>
      </AnimatedSection>
    </MarketingLayout>
  );
}
