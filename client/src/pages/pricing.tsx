import { Check } from "lucide-react";
import { MarketingLayout, FadeIn, PageHero, MarketingCta } from "@/components/marketing-layout";
import { buildPlanComparison, usePublicPlans } from "@/hooks/use-public-plans";
import { PricingPlans } from "@/components/crm/pricing-plans";

const BILLING_NOTES = [
  "Pay securely through Razorpay - your plan activates as soon as the payment is verified",
  "Upgrade to a higher plan anytime from Billing; to cancel, contact our team through the Contact page",
  "A payment receipt for every subscription payment, downloadable from Billing",
  "WhatsApp conversation charges from Meta are separate and billed by Meta",
];

export default function PricingPage() {
  const { data } = usePublicPlans();
  const comparison = buildPlanComparison(data?.plans ?? []);

  return (
    <MarketingLayout>
      <section className="border-b border-slate-200/70 bg-gradient-to-b from-teal-50/60 to-white px-4 pb-12 pt-12 md:pb-16 md:pt-16">
        <div className="mx-auto max-w-6xl">
          <PageHero
            eyebrow="Pricing"
            title="Simple CRM plans"
            subtitle="Every plan includes the CRM - leads, deals, pipeline, follow-ups and tasks - plus the WhatsApp integration. Need a custom setup? Talk to our team."
            centered
          />
        </div>
      </section>

      <section className="px-4 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          {/* Same plans, CTAs and checkout routing as the home page. */}
          <PricingPlans />
        </div>
      </section>

      {comparison.headers.length > 0 && (
        <section className="border-t border-slate-200/70 bg-slate-50/70 px-4 py-14 md:py-20">
          <div className="mx-auto max-w-4xl">
            <FadeIn>
              <h2 className="mb-8 text-center font-heading text-2xl font-bold text-slate-900">Plan comparison</h2>
            </FadeIn>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-4 text-left font-medium text-slate-500">Limit</th>
                    {comparison.headers.map((name) => (
                      <th key={name} className="p-4 font-semibold text-slate-900">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-slate-100 last:border-0">
                      <td className="p-4 text-slate-600">{row.feature}</td>
                      {row.values.map((value, idx) => (
                        <td key={`${row.feature}-${idx}`} className="p-4 text-center text-slate-700">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="mb-6 text-center font-heading text-2xl font-bold text-slate-900">Billing</h2>
            <ul className="space-y-3">
              {BILLING_NOTES.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0E8C7F]" aria-hidden />
                  <span className="text-sm text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      <section className="px-4 pb-16 md:pb-24">
        <div className="mx-auto max-w-5xl">
          <MarketingCta
            title="Need a Custom CRM? Let's Talk"
            subtitle="Tell us about your business, workflow and integrations. Our team will help you configure the right CRM setup."
            ctaLabel="Contact Us"
            ctaHref="/contact"
          />
        </div>
      </section>
    </MarketingLayout>
  );
}
