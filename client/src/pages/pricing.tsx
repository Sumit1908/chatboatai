import { Check } from "lucide-react";
import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { TrustBadgeBanner } from "@/components/trust-badges";
import { buildPlanComparison, usePublicPlans } from "@/hooks/use-public-plans";
import { PricingPlans } from "@/components/crm/pricing-plans";

export default function PricingPage() {
  const { data } = usePublicPlans();
  const comparison = buildPlanComparison(data?.plans ?? []);

  return (
    <MarketingLayout>
      <AnimatedSection variant="particles" intensity="subtle" className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <PageHero
            eyebrow="Pricing"
            title="Simple plans for your CRM and channels"
            subtitle="Every plan includes the CRM — leads, deals, pipeline, follow-ups and tasks — plus the WhatsApp integration. Pay securely with Razorpay and activate your plan instantly."
            centered
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="ticks" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-6xl">
          {/* Same plans, CTAs and checkout routing as the home page. */}
          <PricingPlans />
        </div>
      </AnimatedSection>

      {comparison.headers.length > 0 && (
        <AnimatedSection variant="grid" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10 bg-white/50">
          <div className="container mx-auto max-w-4xl">
            <FadeIn>
              <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-8 text-center">Plan comparison</h2>
            </FadeIn>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 rounded-xl border border-[#075E54]/10 bg-white/90">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#075E54]/10">
                    <th className="text-left p-4 text-[#075E54]/60 font-medium">Feature</th>
                    {comparison.headers.map((name) => (
                      <th key={name} className="p-4 text-[#075E54] font-semibold">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-[#075E54]/5 last:border-0">
                      <td className="p-4 text-[#075E54]/70">{row.feature}</td>
                      {row.values.map((value, idx) => (
                        <td key={`${row.feature}-${idx}`} className="p-4 text-center text-[#075E54]/60">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>
      )}

      <AnimatedSection variant="typing" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-2xl font-heading font-bold text-[#075E54] mb-4 text-center">Billing FAQ</h2>
            <p className="text-center text-[#075E54]/55 mb-8">
              WhatsApp conversation charges from Meta are separate and billed at Meta&apos;s rates. Your ChatBoatAI plan covers the platform.
            </p>
            <div className="space-y-4">
              {[
                "Pay securely through Razorpay — your plan activates as soon as the payment is verified",
                "Upgrade to a higher plan anytime from Billing; to cancel, contact our billing team",
                "A payment receipt for every subscription payment, downloadable from Billing",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 p-4 rounded-xl border border-[#075E54]/10 bg-white/80">
                  <Check className="h-4 w-4 text-[#25D366] shrink-0" />
                  <span className="text-sm text-[#075E54]/70">{item}</span>
                </div>
              ))}
            </div>
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
