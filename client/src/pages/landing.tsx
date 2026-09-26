import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Check, Wrench } from "lucide-react";
import { ContentSeo } from "@/components/seo-head";
import {
  FadeIn,
  MarketingCta,
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing-layout";
import { CrmHero, DEFAULT_HERO_DESCRIPTION } from "@/components/crm/crm-hero";
import { INTEGRATIONS, IntegrationIcon } from "@/components/crm/brand";
import { SectionHeading } from "@/components/crm/marketing-kit";
import { PricingPlans } from "@/components/crm/pricing-plans";
import { PRODUCT_SHOTS, ProductFrame } from "@/components/crm/product-frame";
import { COMING_SOON, HOME_FEATURES, faqs } from "@/lib/marketing-content";

const WORKFLOW_STEPS = [
  {
    n: "1",
    title: "Tell Us Your Workflow",
    desc: "We understand how your business currently manages leads, customers and sales.",
  },
  {
    n: "2",
    title: "Configure Your CRM",
    desc: "We configure the CRM, users, pipeline and supported integrations around your requirements.",
  },
  {
    n: "3",
    title: "Run & Manage",
    desc: "Your team uses the CRM while ChatBoatAI helps you manage the technology and integrations.",
  },
];

const LIVE_INTEGRATIONS = INTEGRATIONS.filter((i) => i.status === "live");
const ROADMAP_INTEGRATIONS = INTEGRATIONS.filter((i) => i.status === "soon");

const outlineLink =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50";

/** Real screens from the app (sample data), one tab per area. */
function ProductShowcase() {
  const [active, setActive] = useState(PRODUCT_SHOTS[0].id);
  const shot = PRODUCT_SHOTS.find((s) => s.id === active) ?? PRODUCT_SHOTS[0];

  return (
    <section id="product" className="scroll-mt-20 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Product"
          title="Everything Your Team Needs, In One CRM"
          subtitle="Dashboard, leads, pipeline, follow-ups, tasks and customer conversations - these are real screens from ChatBoatAI, shown with sample data."
        />
        <div
          role="tablist"
          aria-label="Product screens"
          className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
        >
          {PRODUCT_SHOTS.map((s) => {
            const selected = s.id === shot.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={`product-tab-${s.id}`}
                aria-selected={selected}
                aria-controls="product-panel"
                onClick={() => setActive(s.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
                data-testid={`product-tab-${s.id}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div id="product-panel" role="tabpanel" aria-labelledby={`product-tab-${shot.id}`}>
          <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-slate-600 sm:text-base">{shot.blurb}</p>
          <ProductFrame key={shot.id} shot={shot} className="text-slate-500" />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- page */

export default function Landing() {
  // Admin-editable via Admin -> Website Content (see admin-website-content.tsx);
  // falls back to the default copy whenever unset.
  const { data: websiteSettings } = useQuery<{ heroDescription?: string | null } | null>({
    queryKey: ["/api/website-settings"],
  });
  const heroDescription = websiteSettings?.heroDescription?.trim() || DEFAULT_HERO_DESCRIPTION;

  // Section links from other pages (e.g. /#pricing): the browser tries to
  // scroll before React has rendered the section, so scroll once it exists.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative min-h-screen bg-white text-slate-900 selection:bg-teal-200/60">
      <ContentSeo path="/" />
      <MarketingHeader />

      <main className="overflow-x-clip">
        <CrmHero description={heroDescription} />

        <ProductShowcase />

        {/* Core CRM features - only what works in the app today */}
        <section id="features" className="scroll-mt-20 border-y border-slate-200/70 bg-slate-50/70 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Features"
              title="Everything You Need to Run Your CRM"
              subtitle="Leads, deals, follow-ups and customer conversations in one place - so your team always knows what to do next."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HOME_FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <FadeIn key={feature.id} delay={(i % 4) * 0.05}>
                    <div
                      className={`h-full rounded-2xl border bg-white p-6 shadow-sm ${
                        feature.service ? "border-[#0E8C7F]/30" : "border-slate-200"
                      }`}
                      data-testid={`feature-${feature.id}`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#0E8C7F]">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        {feature.service && (
                          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0E8C7F] ring-1 ring-teal-100">
                            Service
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading text-base font-semibold text-slate-900">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.desc}</p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
            <p className="mt-8 text-center text-sm text-slate-500" data-testid="coming-soon">
              Coming soon: {COMING_SOON.join(" · ")}
            </p>
          </div>
        </section>

        {/* How it works - the custom CRM service */}
        <section id="how-it-works" className="scroll-mt-20 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="How it works"
              title="Your Business. Your Workflow. Your CRM."
              subtitle="Every business manages leads and customers differently. ChatBoatAI can be configured around your workflow - from CRM structure and user access to integrations and your pipeline."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {WORKFLOW_STEPS.map((step, i) => (
                <FadeIn key={step.n} delay={i * 0.06}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0E8C7F] text-sm font-bold text-white">
                      {step.n}
                    </span>
                    <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/contact" className={outlineLink} data-testid="button-talk-about-crm">
                Talk to Us About Your CRM <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Integrations - live ones, plus custom work as a service */}
        <section id="integrations" className="scroll-mt-20 border-y border-slate-200/70 bg-slate-50/70 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Integrations"
              title="Connect Your CRM With The Tools You Already Use"
              subtitle="Connect your CRM with the business tools and communication channels your workflow depends on."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {LIVE_INTEGRATIONS.map((integration) => (
                <div
                  key={integration.id}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  data-testid={`integration-${integration.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <IntegrationIcon integration={integration} className="h-11 w-11 rounded-xl bg-slate-50 ring-1 ring-slate-200" iconClassName="h-6 w-6" />
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Available
                    </span>
                  </div>
                  <p className="mt-4 font-heading text-lg font-semibold text-slate-900">{integration.name} Business</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Connect your WhatsApp Business number through Meta&apos;s official platform: shared inbox, message
                    templates, campaigns and delivery analytics next to your CRM.
                  </p>
                </div>
              ))}
              <div className="flex h-full flex-col rounded-2xl border border-[#0E8C7F]/30 bg-white p-6 shadow-sm" data-testid="integration-custom">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-[#0E8C7F] ring-1 ring-teal-100">
                    <Wrench className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0E8C7F] ring-1 ring-teal-100">
                    Service
                  </span>
                </div>
                <p className="mt-4 font-heading text-lg font-semibold text-slate-900">Custom integrations</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Custom integrations available based on your business requirements. Tell us which tools your team uses
                  and we&apos;ll discuss how to connect them.
                </p>
                <Link href="/contact" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0E8C7F] hover:underline">
                  Discuss an integration <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
            {ROADMAP_INTEGRATIONS.length > 0 && (
              <p className="mt-8 text-center text-sm text-slate-500" data-testid="integrations-roadmap">
                On our roadmap: {ROADMAP_INTEGRATIONS.map((i) => i.name).join(", ")}.
              </p>
            )}
          </div>
        </section>

        {/* Pricing - plans come from GET /api/plans (Admin -> Pricing Plans) */}
        <section id="pricing" className="scroll-mt-20 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Pricing"
              title="Simple monthly plans"
              subtitle="Every plan includes the CRM and the WhatsApp integration. Pay securely with Razorpay and activate instantly."
            />
            <PricingPlans />
            <div className="mt-4 text-center">
              <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0E8C7F] hover:underline">
                Compare plans <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-slate-200/70 bg-slate-50/70 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="FAQ" title="Questions, answered" />
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map(({ q, a }, i) => (
                <AccordionItem key={q} value={`faq-${i}`} className="rounded-xl border border-slate-200 bg-white px-5">
                  <AccordionTrigger className="text-left font-heading text-[15px] font-semibold text-slate-900 hover:no-underline">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-slate-600">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <MarketingCta
              title="Need a Custom CRM? Let's Talk"
              subtitle="Tell us about your business, workflow and integrations. Our team will help you configure the right CRM setup."
              ctaLabel="Contact Us"
              ctaHref="/contact"
            />
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-slate-500">
              <Check className="h-4 w-4 text-[#0E8C7F]" aria-hidden /> Prefer to start yourself?
              <a href="/login?mode=register" className="font-semibold text-[#0E8C7F] hover:underline">
                Create your account
              </a>
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
