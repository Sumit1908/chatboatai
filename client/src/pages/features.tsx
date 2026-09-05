import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { features } from "@/lib/marketing-content";
import { TrustBadgeBanner } from "@/components/trust-badges";

const highlights = [
  "Official Meta WhatsApp Cloud API — no grey tools",
  "Queue-backed sending with rate-limit awareness",
  "Shared inbox for your whole sales team",
  "Campaign reports you can share with clients",
];

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      <AnimatedSection variant="spark" intensity="bold" className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <PageHero
            eyebrow="Platform"
            title="Everything WhatsApp marketing needs, in one place"
            subtitle="Broadcast campaigns, approved templates, a shared team inbox and real-time delivery analytics — built for teams that sell in conversations."
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="particles" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-[#075E54] mb-10 text-center">
              Core platform features
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.06}>
                <div className="h-full p-6 rounded-xl border border-[#075E54]/10 bg-white/80 hover:border-[#25D366]/50 transition-all shadow-sm">
                  <div className="h-11 w-11 rounded-lg bg-[#25D366]/12 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-[#128C7E]" />
                  </div>
                  <h3 className="font-semibold text-[#075E54] mb-1.5">{f.title}</h3>
                  <p className="text-[#075E54]/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="broadcast" intensity="bold" className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <FadeIn>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-[#075E54] mb-4">
                Broadcast at scale, track every message
              </h2>
              <p className="text-[#075E54]/60 leading-relaxed mb-6">
                Launch campaigns to thousands of opted-in contacts with delivery, read and failure status
                updating in real time. Segment by tags, lists or custom filters.
              </p>
              <ul className="space-y-3">
                {["Per-campaign delivery dashboard", "Schedule sends for peak hours", "Retry logic for transient failures"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[#075E54]/70">
                    <Check className="h-4 w-4 text-[#25D366] shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="rounded-2xl border border-[#25D366]/25 bg-white/90 p-6 shadow-xl">
                <p className="text-xs uppercase tracking-wide text-[#075E54]/45 mb-2">Live campaign</p>
                <p className="text-3xl font-heading font-bold text-[#075E54]">7,839 sent</p>
                <p className="text-sm text-[#128C7E] mt-1">90.8% delivered · 41% read</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="inbox" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10 bg-white/40">
        <div className="container mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-[#075E54] mb-4 text-center">
              Shared inbox & team collaboration
            </h2>
            <p className="text-center text-[#075E54]/55 max-w-2xl mx-auto mb-10">
              Every reply from a broadcast lands in one inbox. Assign conversations, add internal notes,
              and never lose a hot lead between teammates.
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-4">
            {["Assign chats to agents", "Full conversation history", "Reply from the same business number", "Notes visible to the team"].map((item, i) => (
              <FadeIn key={item} delay={i * 0.08}>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-[#075E54]/10 bg-white/80">
                  <Check className="h-5 w-5 text-[#25D366] shrink-0" />
                  <span className="text-sm text-[#075E54]/75">{item}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="ticks" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-8 text-center">Why teams choose Sampark</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {highlights.map((h, i) => (
              <FadeIn key={h} delay={i * 0.08}>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#25D366]/8 border border-[#25D366]/20">
                  <Check className="h-5 w-5 text-[#25D366] shrink-0 mt-0.5" />
                  <span className="text-sm text-[#075E54]/75">{h}</span>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.1}>
            <TrustBadgeBanner />
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="messages" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <MarketingCta />
          </FadeIn>
          <FadeIn delay={0.1} className="text-center mt-6">
            <Link href="/how-it-works">
              <Button variant="ghost" className="text-[#075E54] gap-2">
                See how it works <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </AnimatedSection>
    </MarketingLayout>
  );
}
