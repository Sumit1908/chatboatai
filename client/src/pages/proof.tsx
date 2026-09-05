import { Star } from "lucide-react";
import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { testimonials, guarantees } from "@/lib/marketing-content";

const stats = [
  { value: "1M+", label: "messages / month" },
  { value: "90%", label: "avg delivery" },
  { value: "40%", label: "avg read rate" },
  { value: "High", label: "quality rating" },
];

export default function ProofPage() {
  return (
    <MarketingLayout>
      <AnimatedSection variant="helix" intensity="bold" dark className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <PageHero
            eyebrow="Customer proof"
            title="Teams that switched — and stayed"
            subtitle="Real operators using WhatsApp the compliant way: broadcasts, inbox, and delivery proof in one place."
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="ticks" intensity="subtle" className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-[#075E54] mb-10 text-center">
              What customers say
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-[#075E54]/10 bg-white/80 p-6 shadow-sm">
                  <div className="flex gap-1 mb-4">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-[#25D366] text-[#25D366]" />
                    ))}
                  </div>
                  <p className="text-[#075E54]/80 text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <p className="font-semibold text-[#075E54] text-sm">{t.name}</p>
                  <p className="text-[#075E54]/50 text-xs mt-0.5">{t.role}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="wave" intensity="bold" dark className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-white mb-10 text-center">Platform at a glance</h2>
          </FadeIn>
          <div className="flex flex-wrap justify-center gap-10 md:gap-14">
            {stats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.08}>
                <div className="text-center">
                  <p className="text-3xl font-heading font-bold text-[#25D366]">{s.value}</p>
                  <p className="text-[11px] uppercase tracking-wide text-white/45 mt-1">{s.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="rings" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-10 text-center">Our commitments</h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {guarantees.map((g, i) => (
              <FadeIn key={g.title} delay={i * 0.1}>
                <div className="text-center p-6 rounded-2xl border border-[#075E54]/10 bg-white/80">
                  <div className="mx-auto h-12 w-12 rounded-full bg-[#25D366]/12 flex items-center justify-center mb-4">
                    <g.icon className="h-6 w-6 text-[#128C7E]" />
                  </div>
                  <h3 className="font-heading font-semibold text-[#075E54] mb-2">{g.title}</h3>
                  <p className="text-sm text-[#075E54]/55 leading-relaxed">{g.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="broadcast" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <MarketingCta
              title="Join teams already sending on Sampark"
              subtitle="Free trial on every plan. See the delivery reports for yourself before you commit."
            />
          </FadeIn>
        </div>
      </AnimatedSection>
    </MarketingLayout>
  );
}
