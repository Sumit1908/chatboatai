import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { SetupTreeScene, SetupTreeLabels } from "@/components/setup-tree-scene";
import { setupChecklist } from "@/lib/marketing-content";

const troubleshooting = [
  {
    issue: "Template rejected by Meta",
    fix: "Check for promotional language without opt-out, missing variables, or unclear business identity. Our team helps rewrite rejected templates.",
  },
  {
    issue: "Number already on WhatsApp",
    fix: "Migrate the number to API or use a fresh SIM. A number on the API cannot run in the regular WhatsApp app simultaneously.",
  },
  {
    issue: "Low delivery rate",
    fix: "Ensure contacts opted in, use approved templates only, and monitor your Meta quality rating in Settings.",
  },
];

export default function SetupGuidePage() {
  return (
    <MarketingLayout>
      <AnimatedSection variant="spark" intensity="bold" className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <PageHero
            eyebrow="Setup guide"
            title="Your path from signup to first campaign"
            subtitle="Follow this interactive tree to connect Meta, approve templates, and launch your first WhatsApp broadcast on Sampark."
            centered
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="helix" intensity="subtle" className="py-10 md:py-12 px-4 border-t border-[#075E54]/10 bg-white/50">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-2 text-center">
              Interactive setup tree
            </h2>
            <p className="text-center text-[#075E54]/55 mb-6 text-sm">
              Animated nodes show how each step connects — from Meta Business to your first send.
            </p>
          </FadeIn>
          <SetupTreeScene />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="orbit" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-8">Step-by-step checklist</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8 md:gap-10">
            <FadeIn>
              <SetupTreeLabels />
            </FadeIn>
            <div className="space-y-6">
              {setupChecklist.map((phase, i) => (
                <FadeIn key={phase.phase} delay={i * 0.08}>
                  <div className="rounded-xl border border-[#075E54]/10 bg-white/80 p-5">
                    <h3 className="font-semibold text-[#075E54] mb-3">{phase.phase}</h3>
                    <ul className="space-y-2">
                      {phase.items.map((item) => (
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
        </div>
      </AnimatedSection>

      <AnimatedSection variant="inbox" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-8 text-center">Common setup issues</h2>
          </FadeIn>
          <div className="space-y-4">
            {troubleshooting.map((item, i) => (
              <FadeIn key={item.issue} delay={i * 0.08}>
                <div className="p-5 rounded-xl border border-[#075E54]/10 bg-white/80">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[#128C7E] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-[#075E54] mb-1">{item.issue}</h3>
                      <p className="text-sm text-[#075E54]/60 leading-relaxed">{item.fix}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="ticks" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10 bg-[#ECE5DD]/40">
        <div className="container mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-4">Need hands-on help?</h2>
            <p className="text-[#075E54]/55 mb-8">
              Our team walks you through Meta embeds, template fixes, and number migration on call or WhatsApp.
            </p>
            <Link href="/contact">
              <Button variant="outline" className="border-[#075E54]/20 text-[#075E54] gap-2">
                Contact support <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="messages" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <MarketingCta
              title="Ready to start setup?"
              subtitle="Create your account and follow the in-app Settings wizard — we'll guide you every step."
            />
          </FadeIn>
        </div>
      </AnimatedSection>
    </MarketingLayout>
  );
}
