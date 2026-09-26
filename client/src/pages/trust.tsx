import { Shield } from "lucide-react";
import { FadeIn } from "@/components/marketing-layout";
import { Band, FeatureCard, MarketingPage, SectionHeading } from "@/components/crm/marketing-kit";
import { guarantees, trustPillars } from "@/lib/marketing-content";

const practices = [
  "CRM records are scoped to the account that owns them on every request",
  "Passwords are stored as bcrypt hashes, never in plain text",
  "HTTPS everywhere; payments are processed by Razorpay",
  "WhatsApp messages sent only through Meta's official Cloud API, with templates for outbound",
  "Opt-in contact lists only for WhatsApp marketing — no scraped numbers",
  // OWNER REVIEW: data-deletion timeline, stated as policy on /delete-data.
  "Data deletion on request within 30 days",
];

export default function TrustPage() {
  return (
    <MarketingPage
      eyebrow="Trust & security"
      title="Your customer data, handled with care"
      subtitle="Your leads, deals and conversations are your business's most valuable data. Here's how ChatBoatAI protects them."
    >
      <Band tinted>
        <SectionHeading eyebrow="Principles" title="How we protect your workspace" />
        <div className="grid gap-5 sm:grid-cols-2">
          {trustPillars.map((p, i) => (
            <FadeIn key={p.title} delay={(i % 2) * 0.08}>
              <FeatureCard icon={p.icon} title={p.title} desc={p.desc} />
            </FadeIn>
          ))}
        </div>
      </Band>

      <Band>
        <SectionHeading eyebrow="In practice" title="What we actually do" />
        <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
          {practices.map((point, i) => (
            <FadeIn key={point} delay={(i % 2) * 0.06}>
              <div className="flex h-full items-start gap-3 rounded-xl border border-[#04322E]/10 bg-white p-4">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#14B8A6]" aria-hidden />
                <span className="text-sm text-[#04322E]/75">{point}</span>
              </div>
            </FadeIn>
          ))}
        </div>
      </Band>

      <Band tinted>
        <SectionHeading eyebrow="Our promise" title="What you can expect from us" />
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
