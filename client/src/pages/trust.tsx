import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { trustPillars, guarantees } from "@/lib/marketing-content";
import { TrustBadgeBanner, TrustBadgeRow } from "@/components/trust-badges";
import { Shield, Lock, BadgeCheck, Headphones } from "lucide-react";

const compliancePoints = [
  "Opt-in contact lists only — no scraped numbers",
  "Template-based outbound messaging via Meta",
  "HTTPS everywhere, Razorpay for payments",
  "Data deletion on request within 30 days",
];

export default function TrustPage() {
  return (
    <MarketingLayout>
      <AnimatedSection variant="shield" intensity="bold" dark className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <PageHero
            eyebrow="Trust & compliance"
            title="Built so you can send with confidence"
            subtitle="WhatsApp is where your buyers live — but only if your stack is official, transparent, and accountable."
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="rings" intensity="subtle" className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-[#075E54] mb-10 text-center">
              Our trust pillars
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-5">
            {trustPillars.map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-[#075E54]/10 bg-white/80 p-6 hover:border-[#25D366]/40 transition-colors">
                  <div className="h-11 w-11 rounded-xl bg-[#25D366]/12 flex items-center justify-center mb-4">
                    <p.icon className="h-5 w-5 text-[#128C7E]" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-[#075E54] mb-2">{p.title}</h3>
                  <p className="text-sm text-[#075E54]/65 leading-relaxed">{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="grid" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10 bg-white/50">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-4 text-center">Compliance by design</h2>
            <p className="text-center text-[#075E54]/55 mb-10">We built Sampark for long-term senders, not shortcut tools.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-4">
            {compliancePoints.map((point, i) => (
              <FadeIn key={point} delay={i * 0.08}>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-[#075E54]/10 bg-white/90">
                  <Shield className="h-5 w-5 text-[#25D366] shrink-0" />
                  <span className="text-sm text-[#075E54]/75">{point}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="wave" intensity="bold" dark className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-white mb-10 text-center">Our promise to you</h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {guarantees.map((g, i) => (
              <FadeIn key={g.title} delay={i * 0.1}>
                <div className="text-center p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="mx-auto h-12 w-12 rounded-full bg-[#25D366]/20 flex items-center justify-center mb-4">
                    <g.icon className="h-6 w-6 text-[#25D366]" />
                  </div>
                  <h3 className="font-heading font-semibold text-white mb-2">{g.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{g.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.15} className="mt-12">
            <TrustBadgeRow
              variant="dark"
              badges={[
                { icon: "whatsapp", label: "Official Meta API", sublabel: "WhatsApp Cloud API" },
                { icon: Lock, label: "Secure checkout", sublabel: "Razorpay · HTTPS" },
                { icon: BadgeCheck, label: "No grey tools", sublabel: "Ban-safe sending" },
                { icon: Headphones, label: "Human support", sublabel: "Setup & templates" },
              ]}
            />
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="soft" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <TrustBadgeBanner />
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="broadcast" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <MarketingCta
              title="Send on WhatsApp with confidence"
              subtitle="Official API, transparent delivery, and a team that helps you stay compliant."
            />
          </FadeIn>
        </div>
      </AnimatedSection>
    </MarketingLayout>
  );
}
