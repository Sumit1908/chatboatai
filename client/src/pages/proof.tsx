import { Star } from "lucide-react";
import { FadeIn } from "@/components/marketing-layout";
import { Band, FeatureCard, MarketingPage, SectionHeading } from "@/components/crm/marketing-kit";
import { TESTIMONIALS_VERIFIED, guarantees, testimonials } from "@/lib/marketing-content";

export default function ProofPage() {
  return (
    <MarketingPage
      eyebrow="Customer proof"
      title={TESTIMONIALS_VERIFIED ? "What our customers say" : "Our commitments to you"}
      subtitle={
        TESTIMONIALS_VERIFIED
          ? "Here's what customers told us about the WhatsApp side of the platform."
          : "Customer stories are coming soon. Until then, here's what you can expect from us."
      }
    >
      {TESTIMONIALS_VERIFIED && (
      <Band tinted>
        <SectionHeading eyebrow="In their words" title="From teams using ChatBoatAI for WhatsApp" />
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-2xl border border-[#04322E]/10 bg-[#F4FBF9] p-6">
                <div className="mb-3 flex gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-current" aria-hidden />
                  ))}
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-[#04322E]/75">“{t.quote}”</blockquote>
                <figcaption className="mt-4">
                  <p className="font-heading font-semibold text-[#04322E]">{t.name}</p>
                  <p className="text-xs text-[#04322E]/55">{t.role}</p>
                </figcaption>
              </figure>
            </FadeIn>
          ))}
        </div>
      </Band>
      )}

      <Band tinted={!TESTIMONIALS_VERIFIED}>
        <SectionHeading eyebrow="Our commitments" title="Why teams trust us" />
        <div className="grid gap-5 md:grid-cols-3">
          {guarantees.map((g, i) => (
            <FadeIn key={g.title} delay={i * 0.08}>
              <FeatureCard icon={g.icon} title={g.title} desc={g.desc} />
            </FadeIn>
          ))}
        </div>
      </Band>
    </MarketingPage>
  );
}
