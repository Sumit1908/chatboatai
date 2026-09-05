import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { steps } from "@/lib/marketing-content";

const requirements = [
  "Facebook Business Manager with admin access",
  "A dedicated phone number for WhatsApp API",
  "Business website or Facebook Page for verification",
  "Opted-in contact list for marketing broadcasts",
];

const timeline = [
  { day: "Day 1", title: "Connect API", desc: "Complete embedded signup and paste your WABA credentials in Settings." },
  { day: "Day 1–2", title: "Submit templates", desc: "Create and submit your first marketing template to Meta for approval." },
  { day: "Day 2–3", title: "Import contacts", desc: "Upload your opted-in list, tag segments, and run a test batch." },
  { day: "Day 3", title: "Launch campaign", desc: "Schedule your broadcast and watch delivery metrics live." },
];

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <AnimatedSection variant="orbit" intensity="bold" className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <PageHero
            eyebrow="Setup"
            title="Live in three steps, not three weeks"
            subtitle="If you have a Facebook Business account and a phone number, you can be sending your first campaign within days."
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="helix" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-[#075E54] mb-10 text-center">
              Three steps to go live
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className="h-full p-6 rounded-xl border border-[#075E54]/10 bg-white/80 hover:border-[#25D366]/40 transition-colors">
                  <div className="text-3xl font-semibold bg-gradient-to-br from-[#128C7E] to-[#25D366] bg-clip-text text-transparent font-mono mb-4">
                    {step.n}
                  </div>
                  <h3 className="font-semibold text-lg mb-1.5 text-[#075E54]">{step.title}</h3>
                  <p className="text-[#075E54]/55 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="wave" intensity="bold" dark className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-white mb-10 text-center">Typical timeline</h2>
          </FadeIn>
          <div className="space-y-4">
            {timeline.map((item, i) => (
              <FadeIn key={item.day} delay={i * 0.08}>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-4 sm:p-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="shrink-0 text-sm font-semibold text-[#25D366] sm:w-20">{item.day}</div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-white/65">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="typing" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-4 text-center">What you&apos;ll need</h2>
            <p className="text-center text-[#075E54]/55 mb-10">Gather these before you start — most teams already have them.</p>
          </FadeIn>
          <ul className="space-y-3">
            {requirements.map((req, i) => (
              <FadeIn key={req} delay={i * 0.08}>
                <li className="flex items-center gap-3 p-4 rounded-xl border border-[#075E54]/10 bg-white/80">
                  <Check className="h-5 w-5 text-[#25D366] shrink-0" />
                  <span className="text-sm text-[#075E54]/75">{req}</span>
                </li>
              </FadeIn>
            ))}
          </ul>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="messages" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10 bg-[#ECE5DD]/40">
        <div className="container mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-4">Want the full setup walkthrough?</h2>
            <p className="text-[#075E54]/55 mb-8">
              Our interactive setup guide shows the complete tree — from Meta Business Manager to your first campaign.
            </p>
            <Link href="/setup-guide">
              <Button size="lg" className="gap-2 bg-[#075E54] hover:bg-[#0a6b5f] text-white">
                View Setup Guide <ArrowRight className="h-4 w-4" />
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
