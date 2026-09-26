import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";
import { ContentSeo } from "@/components/seo-head";
import {
  FadeIn,
  MarketingCta,
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing-layout";
import { CrmHero, DEFAULT_HERO_DESCRIPTION } from "@/components/crm/crm-hero";
import { CRM } from "@/components/crm/brand";
import {
  AiLayerSection,
  IntegrationsGrid,
  ModuleGrid,
  SectionHeading,
  WhatsAppSection,
} from "@/components/crm/marketing-kit";
import { PricingPlans } from "@/components/crm/pricing-plans";
import { PRODUCT_SHOTS, ProductFrame } from "@/components/crm/product-frame";
import { CRM_MODULES, faqs } from "@/lib/marketing-content";

// Only what works in the app today; planned modules are listed separately.
const LIVE_MODULES = CRM_MODULES.filter((m) => m.status === "live");
const SOON_MODULES = CRM_MODULES.filter((m) => m.status === "soon");

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Connect Your Business",
    desc: "Create your account, then connect your WhatsApp Business number through Meta's official platform and import your contacts from a CSV.",
  },
  {
    n: "02",
    title: "Manage Leads & Conversations",
    desc: "Add every enquiry as a lead, reply to customers from the WhatsApp inbox, and schedule follow-ups and tasks so nothing slips.",
  },
  {
    n: "03",
    title: "Close More Deals",
    desc: "Move deals through your pipeline from New to Closed Won, and see deals won and revenue on your dashboard.",
  },
];

// Every answer describes how the product works today - no promises beyond it.
const HOME_FAQS = [
  ...faqs.filter((f) => f.category === "general"),
  {
    q: "Are the AI tools available?",
    a: "Not yet. AI features such as lead summaries, reply drafts and lead scoring are in development and are labelled “Coming soon”. They are not part of any plan today.",
  },
  ...faqs.filter((f) => f.category === "whatsapp").slice(0, 3),
  ...faqs.filter((f) => f.category === "billing"),
  {
    q: "How do I pay for a plan?",
    a: "Choose a plan on the Billing page inside the app and pay securely through Razorpay. Your plan's features and limits are shown before you pay.",
  },
];

/** Real screenshots of the app, one tab per area. */
function ProductShowcase() {
  const [active, setActive] = useState(PRODUCT_SHOTS[0].id);
  const shot = PRODUCT_SHOTS.find((s) => s.id === active) ?? PRODUCT_SHOTS[0];

  return (
    <section id="product" className="scroll-mt-24 overflow-hidden bg-[#04322E] px-4 py-16 text-white md:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          light
          eyebrow="Inside the app"
          title="See your whole sales operation in one dashboard"
          subtitle="Leads, pipeline, follow-ups, tasks, revenue and WhatsApp activity — these are real screens from ChatBoatAI, shown with sample data."
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
                    ? "bg-white text-[#04322E]"
                    : "bg-white/10 text-teal-50/80 ring-1 ring-white/15 hover:bg-white/15 hover:text-white"
                }`}
                data-testid={`product-tab-${s.id}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div id="product-panel" role="tabpanel" aria-labelledby={`product-tab-${shot.id}`}>
          <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-teal-50/80 sm:text-base">{shot.blurb}</p>
          <ProductFrame key={shot.id} shot={shot} className="text-teal-50" />
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
    <div className="relative min-h-screen text-[#04322E] selection:bg-teal-200/60" style={{ backgroundColor: CRM.mist }}>
      <ContentSeo path="/" />
      <MarketingHeader overlay />

      <main className="overflow-x-clip">
        <CrmHero description={heroDescription} />

        {/* Features - statuses come from CRM_MODULES (single source of truth) */}
        <section id="features" className="scroll-mt-24 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Features"
              title="Everything You Need to Manage Your Sales"
              subtitle="Leads, contacts, deals, pipeline, follow-ups and tasks share one record of every customer — so your team always knows what to do next."
            />
            <ModuleGrid modules={LIVE_MODULES} />
            {SOON_MODULES.length > 0 && (
              <p className="mt-8 text-center text-sm text-[#04322E]/55">
                Coming soon: {SOON_MODULES.map((m) => m.name).join(", ")} and AI tools.
              </p>
            )}
            <div className="mt-6 text-center">
              <a
                href="/crm"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0E8C7F] transition-colors hover:text-[#04322E]"
              >
                Explore the CRM <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        <AiLayerSection id="ai" title="Your CRM, With AI Built In" />

        <WhatsAppSection
          id="whatsapp"
          title="Turn WhatsApp Into Your Sales Workspace"
          showcase
          className="border-y border-[#04322E]/10 bg-white"
        />

        <ProductShowcase />

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="How it works"
              title="From first enquiry to closed deal"
              subtitle="No developers and no complicated migration."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, i) => (
                <FadeIn key={step.n} delay={i * 0.08}>
                  <div className="relative h-full rounded-2xl border border-[#04322E]/10 bg-white p-7">
                    <span className="font-heading text-4xl font-bold text-teal-200">{step.n}</span>
                    <h3 className="mt-2 font-heading text-lg font-semibold text-[#04322E]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#04322E]/60">{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section id="integrations" className="scroll-mt-24 border-y border-[#04322E]/10 bg-white px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Integrations"
              title="Your business tools, connected to one CRM"
              subtitle="WhatsApp is live today. The others are on our roadmap and are marked “Coming soon”."
            />
            <IntegrationsGrid />
          </div>
        </section>

        {/* Pricing - plans come from GET /api/plans (Admin -> Pricing Plans) */}
        <section id="pricing" className="scroll-mt-24 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Pricing"
              title="Simple plans that grow with your team"
              subtitle="Every plan includes the CRM and the WhatsApp integration. Pay securely with Razorpay and activate instantly."
            />
            <PricingPlans />
            <div className="mt-4 text-center">
              <a
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0E8C7F] transition-colors hover:text-[#04322E]"
              >
                Compare plans in detail <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 border-t border-[#04322E]/10 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="FAQ" title="Questions, answered" />
            <Accordion type="single" collapsible className="space-y-3">
              {HOME_FAQS.map(({ q, a }, i) => (
                <AccordionItem
                  key={q}
                  value={`faq-${i}`}
                  className="rounded-xl border border-[#04322E]/10 bg-white px-5"
                >
                  <AccordionTrigger className="text-left font-heading text-[15px] font-semibold text-[#04322E] hover:no-underline">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-[#04322E]/65">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="mt-6 text-center text-sm text-[#04322E]/55">
              More answers on the{" "}
              <a href="/faq" className="font-medium text-[#0E8C7F] underline underline-offset-2">
                FAQ page
              </a>
              , or{" "}
              <a href="/contact" className="font-medium text-[#0E8C7F] underline underline-offset-2">
                contact us
              </a>
              .
            </p>
          </div>
        </section>

        <section className="px-4 pb-16 md:pb-24">
          <div className="mx-auto max-w-5xl">
            <MarketingCta
              dark
              title="Ready to Manage Your Business Smarter?"
              subtitle="Bring your leads, deals, follow-ups and WhatsApp conversations into one CRM. Choose a plan and activate it instantly with secure Razorpay checkout."
              ctaLabel="Get Started"
            />
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
