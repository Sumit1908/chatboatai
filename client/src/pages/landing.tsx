import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, Check, ChevronDown, Clock, Wrench } from "lucide-react";
import { ContentSeo } from "@/components/seo-head";
import { FadeIn, MarketingFooter, MarketingHeader } from "@/components/marketing-layout";
import { CrmShowcase } from "@/components/crm/crm-showcase";
import { INTEGRATIONS, IntegrationIcon, integrationById } from "@/components/crm/brand";
import {
  AUDIENCES,
  COMING_SOON,
  CUSTOM_INTEGRATION,
  SETUP_ITEMS,
  SETUP_STEPS,
  WHY_FEATURES,
} from "@/lib/marketing-content";

export const DEFAULT_HERO_DESCRIPTION =
  "CRM software to manage leads, customers, sales pipelines and follow-ups from one dashboard - with custom CRM setup, configuration and integration support from the ChatBoatAI team.";

const REGISTER_HREF = "/login?mode=register";
const DEMO_HREF = "/contact";

const WHATSAPP = integrationById("whatsapp");
const META_LEADS = integrationById("facebook-leads");
/** Other roadmap integrations (status "soon" in brand.tsx), besides Meta Lead Ads which gets its own card. */
const ROADMAP_INTEGRATIONS = INTEGRATIONS.filter((i) => i.status === "soon" && i.id !== META_LEADS.id);

const primaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-400 px-7 text-[15px] font-semibold text-slate-950 shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
const secondaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 text-[15px] font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300";
const card = "rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]";

const STATUS_PILL = {
  included: { label: "Included", className: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20" },
  service: { label: "Setup service", className: "bg-teal-400/10 text-teal-200 ring-teal-400/20" },
  soon: { label: "Coming Soon", className: "bg-amber-400/10 text-amber-300 ring-amber-400/20" },
} as const;

function Pill({ status }: { status: keyof typeof STATUS_PILL }) {
  const { label, className } = STATUS_PILL[status];
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${className}`}>
      {label}
    </span>
  );
}

function DarkHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <FadeIn>
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
        {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">{eyebrow}</p>}
        <h2 className="font-heading text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="mt-4 text-base leading-relaxed text-slate-400 md:text-lg">{subtitle}</p>}
      </div>
    </FadeIn>
  );
}

/** Hero visual: what a ChatBoatAI CRM setup covers, with honest statuses. */
function SetupCard() {
  return (
    <div className={`${card} overflow-hidden bg-slate-900/70 backdrop-blur`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-white">Your CRM setup</p>
          <p className="text-xs text-slate-400">Software + configuration by the ChatBoatAI team</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-400/20">
          <Wrench className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <ul className="divide-y divide-white/5">
        {SETUP_ITEMS.map((item) => (
          <li key={item.title} className="flex items-center gap-3 px-5 py-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                item.status === "soon" ? "bg-white/5 text-slate-500" : "bg-teal-400/15 text-teal-300"
              }`}
            >
              {item.status === "soon" ? <Clock className="h-3.5 w-3.5" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100">{item.title}</p>
              <p className="text-xs text-slate-500">{item.detail}</p>
            </div>
            <Pill status={item.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Hero({ description }: { description: string }) {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(45,212,191,0.18),transparent),radial-gradient(ellipse_50%_40%_at_90%_20%,rgba(59,130,246,0.12),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pb-16 pt-12 md:pt-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12 lg:pb-24 lg:pt-20">
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-200">
            CRM software · Custom CRM setup · Integration support
          </p>
          <h1 className="mt-5 font-heading text-[2.1rem] font-bold leading-[1.1] tracking-tight text-white min-[400px]:text-[2.35rem] sm:text-5xl xl:text-[3.25rem]">
            Manage Your Entire CRM From{" "}
            <span className="bg-gradient-to-r from-teal-300 to-sky-400 bg-clip-text text-transparent">One Dashboard</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">{description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a href={REGISTER_HREF} className={primaryButton} data-testid="button-get-started">
              Get Started <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a href={DEMO_HREF} className={secondaryButton} data-testid="button-book-demo">
              <CalendarCheck className="h-4 w-4" aria-hidden /> Book CRM Demo
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            Built for Real Estate Companies, Agencies, Sales Teams, and Growing Businesses.
          </p>
        </div>
        <div className="crm-rise mx-auto w-full max-w-xl lg:max-w-none">
          <SetupCard />
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

  // Section links from other pages (e.g. /#integrations): the browser tries to
  // scroll before React has rendered the section, so scroll once it exists.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, []);

  const CustomIcon = CUSTOM_INTEGRATION.icon;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-400/30">
      <ContentSeo path="/" />
      <MarketingHeader tone="dark" />

      <main className="overflow-x-clip">
        <Hero description={heroDescription} />

        {/* CRM product showcase - static mockup with dummy data, not a working CRM */}
        <section id="product" className="scroll-mt-20 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <DarkHeading
              eyebrow="Product tour"
              title="Everything You Need To Manage Your CRM"
              subtitle="See how ChatBoatAI can help your team organize leads, customers, sales and daily follow-ups from one place."
            />
            <FadeIn>
              <CrmShowcase />
            </FadeIn>
            <p className="mt-4 text-center text-xs text-slate-500">Product preview with sample data.</p>
            <div className="mt-12 flex flex-col items-center gap-5 rounded-3xl border border-teal-400/20 bg-gradient-to-br from-teal-500/10 via-slate-900 to-sky-500/10 px-5 py-10 text-center md:flex-row md:justify-between md:px-10 md:text-left">
              <div>
                <h3 className="font-heading text-xl font-bold text-white md:text-2xl">Want a CRM Built Around Your Business?</h3>
                <p className="mt-2 text-sm text-slate-300 md:text-base">Talk to our team about CRM setup, configuration and integrations.</p>
              </div>
              <a href={DEMO_HREF} className={`${primaryButton} shrink-0`} data-testid="button-showcase-demo">
                <CalendarCheck className="h-4 w-4" aria-hidden /> Book CRM Demo
              </a>
            </div>
          </div>
        </section>

        {/* Why ChatBoatAI CRM - only what works in the app today, plus the setup service */}
        <section id="features" className="scroll-mt-20 border-y border-white/10 bg-slate-900/40 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <DarkHeading
              eyebrow="Why ChatBoatAI CRM"
              title="CRM Software, Setup and Support in One Place"
              subtitle="Leads, deals, follow-ups and customer conversations in one CRM - configured around how your team already works."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {WHY_FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <FadeIn key={f.id} delay={(i % 4) * 0.05}>
                    <div
                      className={`${card} h-full p-6 ${f.service ? "border-teal-400/25" : ""}`}
                      data-testid={`feature-${f.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-400/20">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        {f.service && <Pill status="service" />}
                      </div>
                      <h3 className="mt-4 font-heading text-base font-semibold text-white">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
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

        {/* Integrations - live, coming soon, and custom work as a service */}
        <section id="integrations" className="scroll-mt-20 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <DarkHeading
              eyebrow="Integrations"
              title="Connect Your CRM With The Tools You Use"
              subtitle="Start with WhatsApp Business today. For other tools, our team provides CRM integration support based on your requirements."
            />
            <div className="grid gap-4 md:grid-cols-3">
              <div className={`${card} h-full p-6`} data-testid="integration-whatsapp">
                <div className="flex items-start justify-between gap-3">
                  <IntegrationIcon integration={WHATSAPP} className="h-11 w-11 rounded-xl" iconClassName="h-6 w-6" />
                  <Pill status="included" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-white">WhatsApp Business API</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Connect your WhatsApp Business number through Meta&apos;s official platform: shared inbox, message
                  templates, campaigns and delivery analytics next to your CRM.
                </p>
              </div>
              <div className={`${card} h-full p-6`} data-testid="integration-meta-leads">
                <div className="flex items-start justify-between gap-3">
                  <IntegrationIcon integration={META_LEADS} className="h-11 w-11 rounded-xl" iconClassName="h-6 w-6" />
                  <Pill status="soon" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-white">Meta Lead Ads</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Capture leads from Facebook and Instagram lead-ad campaigns directly in your CRM. This integration is
                  on our roadmap and not available yet.
                </p>
              </div>
              <div className={`${card} flex h-full flex-col border-teal-400/25 p-6`} data-testid="integration-custom">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-400/20">
                    <CustomIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <Pill status="service" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-white">{CUSTOM_INTEGRATION.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{CUSTOM_INTEGRATION.desc}</p>
                <a href={DEMO_HREF} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 hover:underline">
                  Discuss an integration <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>
            {ROADMAP_INTEGRATIONS.length > 0 && (
              <p className="mt-8 text-center text-sm text-slate-500" data-testid="integrations-roadmap">
                Also on our roadmap: {ROADMAP_INTEGRATIONS.map((i) => i.name).join(", ")}.
              </p>
            )}
          </div>
        </section>

        {/* How it works - the custom CRM setup service */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-white/10 bg-slate-900/40 px-4 py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <FadeIn>
              <div className="text-center lg:text-left">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">How it works</p>
                <h2 className="font-heading text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
                  Your Business. Your Workflow. Your CRM.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-slate-400 md:text-lg">
                  Every business manages leads and customers differently. ChatBoatAI can be configured around your
                  workflow - from CRM structure and user access to integrations and your pipeline.
                </p>
                <a href={DEMO_HREF} className={`${secondaryButton} mt-8`} data-testid="button-how-demo">
                  Talk to Us About Your CRM <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={0.08}>
              <ol className="mx-auto max-w-md" aria-label="CRM setup steps">
                {SETUP_STEPS.map((step, i) => (
                  <li key={step.title}>
                    <div className={`${card} flex gap-4 bg-slate-900/80 p-4`}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-400 text-sm font-bold text-slate-950">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{step.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.desc}</p>
                      </div>
                    </div>
                    {i < SETUP_STEPS.length - 1 && (
                      <div className="flex justify-center py-1 text-teal-400/70" aria-hidden>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </FadeIn>
          </div>
        </section>

        {/* Who it's for */}
        <section id="who-its-for" className="scroll-mt-20 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <DarkHeading eyebrow="Who it's for" title="Built for Teams That Run on Their CRM" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map((a, i) => {
                const Icon = a.icon;
                return (
                  <FadeIn key={a.id} delay={i * 0.05}>
                    <div className={`${card} h-full p-6`} data-testid={`audience-${a.id}`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/20">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <h3 className="mt-4 font-heading text-base font-semibold text-white">{a.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{a.desc}</p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-16 md:pb-24">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-teal-400/20 bg-gradient-to-br from-teal-500/15 via-slate-900 to-sky-500/10 px-5 py-14 text-center sm:px-10 sm:py-16">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-white md:text-4xl">
              Everything Your CRM Needs. One Platform.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
              Leads, deals, follow-ups, your team and WhatsApp in one CRM - set up, configured and supported by the
              ChatBoatAI team.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={DEMO_HREF} className={primaryButton} data-testid="button-cta-demo">
                <CalendarCheck className="h-4 w-4" aria-hidden /> Book CRM Demo
              </a>
              <a href={REGISTER_HREF} className={secondaryButton} data-testid="button-cta">
                Get Started <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter tone="dark" />
    </div>
  );
}
