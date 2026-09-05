import { Check } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  MarketingLayout,
  FadeIn,
  PageHero,
  MarketingCta,
} from "@/components/marketing-layout";
import { AnimatedSection } from "@/components/section-backdrop";
import { TrustBadgeBanner } from "@/components/trust-badges";
import {
  buildPlanComparison,
  toMarketingPlanCards,
  usePublicPlans,
} from "@/hooks/use-public-plans";
import { Skeleton } from "@/components/ui/skeleton";

export default function PricingPage() {
  const { data, isLoading } = usePublicPlans();
  const plans = toMarketingPlanCards(data?.plans ?? []);
  const comparison = buildPlanComparison(data?.plans ?? []);

  return (
    <MarketingLayout>
      <AnimatedSection variant="particles" intensity="subtle" className="pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <PageHero
            eyebrow="Pricing"
            title="Simple plans that scale with your messaging"
            subtitle="Every plan runs on the official API. Meta's per-conversation charges are billed at cost — we never mark them up."
            centered
          />
        </div>
      </AnimatedSection>

      <AnimatedSection variant="ticks" intensity="bold" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <p className="text-center text-[#075E54]/50">Plans will appear here soon.</p>
          ) : (
            <div className={`grid gap-6 items-stretch ${plans.length >= 3 ? "md:grid-cols-3" : plans.length === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" : "max-w-md mx-auto"}`}>
              {plans.map((plan, i) => (
                <FadeIn key={plan.id} delay={i * 0.1}>
                  <div
                    className={`h-full flex flex-col rounded-2xl p-8 relative ${
                      plan.featured
                        ? "border-2 border-[#25D366] bg-white shadow-2xl shadow-[#25D366]/15"
                        : "border border-[#075E54]/10 bg-white/80"
                    }`}
                  >
                    {plan.featured && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#25D366] text-white text-xs font-semibold uppercase tracking-wide px-4 py-1 flex items-center gap-1">
                        <FaWhatsapp className="h-3 w-3" /> Most Popular
                      </div>
                    )}
                    <h3 className="text-xl font-heading font-semibold text-[#075E54]">{plan.name}</h3>
                    <p className="text-[#075E54]/45 text-sm mt-1">{plan.tagline}</p>
                    <div className="mt-6 mb-1">
                      <span className="text-4xl font-bold text-[#075E54]">{plan.price}</span>
                      <span className="text-[#075E54]/45">/month</span>
                    </div>
                    <p className="text-xs text-[#075E54]/40 font-mono mb-6">+ Meta conversation charges, + GST</p>
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-[#25D366] flex-shrink-0" />
                          <span className="text-[#075E54]/75 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <a href={"/login"} className="block">
                      <Button
                        className={`w-full font-semibold gap-2 ${
                          plan.featured
                            ? "bg-[#25D366] text-white hover:bg-[#20bd5a]"
                            : "border border-[#075E54]/15 bg-transparent text-[#075E54] hover:bg-[#25D366]/10"
                        }`}
                        size="lg"
                        variant={plan.featured ? "default" : "outline"}
                      >
                        {plan.featured && <FaWhatsapp className="h-4 w-4" />}
                        {plan.cta}
                      </Button>
                    </a>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
          <p className="text-center text-sm text-[#075E54]/40 font-mono mt-8">
            All prices exclusive of GST · Free trial on every plan · No setup fees
          </p>
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
              Meta conversation charges are separate and billed at Meta&apos;s rates. Your ChatBoatAI plan covers the platform only.
            </p>
            <div className="space-y-4">
              {[
                "Free trial on every plan — no credit card required to start",
                "Cancel anytime from Billing settings",
                "GST invoiced on all subscription payments via Razorpay",
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
