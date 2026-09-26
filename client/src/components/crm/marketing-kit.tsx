import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, Bot, Check, type LucideIcon } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { FadeIn, MarketingCta, MarketingLayout } from "@/components/marketing-layout";
import {
  AI_CAPABILITIES,
  CRM_MODULES,
  WHATSAPP_CAPABILITIES,
  type CrmModule,
  type ModuleStatus,
} from "@/lib/marketing-content";
import { INTEGRATIONS, IntegrationIcon, accentButton, type Integration } from "./brand";
import { ProductFrame, productShot } from "./product-frame";

/* Shared building blocks for the public marketing pages (CRM-first). */

export function StatusChip({ status }: { status: ModuleStatus }) {
  return status === "live" ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      Live
    </span>
  ) : (
    <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
      Coming soon
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <FadeIn>
      <div className="mx-auto mb-12 max-w-2xl text-center md:mb-14">
        <p
          className={`mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${
            light ? "bg-white/10 text-teal-100 ring-white/20" : "bg-teal-50 text-[#0E8C7F] ring-teal-100"
          }`}
        >
          {eyebrow}
        </p>
        <h2 className={`font-heading text-3xl font-bold tracking-tight md:text-4xl ${light ? "text-white" : "text-[#04322E]"}`}>
          {title}
        </h2>
        {subtitle && (
          <p className={`mt-4 text-base leading-relaxed md:text-lg ${light ? "text-teal-50/80" : "text-[#04322E]/60"}`}>
            {subtitle}
          </p>
        )}
      </div>
    </FadeIn>
  );
}

const cardBase =
  "group h-full rounded-2xl border border-[#04322E]/10 bg-white p-6 shadow-[0_1px_2px_rgba(4,50,46,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#14B8A6]/40 hover:shadow-[0_18px_40px_-20px_rgba(4,50,46,0.35)]";

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-[#0E8C7F] ring-1 ring-teal-100 transition-colors duration-300 group-hover:from-[#14B8A6] group-hover:to-[#0B6E66] group-hover:text-white">
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

export function FeatureCard({ icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className={cardBase}>
      <div className="mb-4">
        <IconTile icon={icon} />
      </div>
      <h3 className="font-heading text-lg font-semibold text-[#04322E]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#04322E]/60">{desc}</p>
    </div>
  );
}

export function ModuleCard({ module, detailed = false }: { module: CrmModule; detailed?: boolean }) {
  return (
    <div className={`${cardBase} ${module.status === "soon" ? "bg-white/70" : ""}`} data-testid={`module-${module.id}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <IconTile icon={module.icon} />
        <StatusChip status={module.status} />
      </div>
      <h3 className="font-heading text-lg font-semibold text-[#04322E]">{module.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#04322E]/60">{module.summary}</p>
      {detailed && (
        <ul className="mt-4 space-y-2">
          {module.points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-[#04322E]/75">
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${module.status === "live" ? "text-[#14B8A6]" : "text-slate-300"}`} aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ModuleGrid({ detailed = false, modules = CRM_MODULES }: { detailed?: boolean; modules?: CrmModule[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((m, i) => (
        <FadeIn key={m.id} delay={(i % 3) * 0.06}>
          <ModuleCard module={m} detailed={detailed} />
        </FadeIn>
      ))}
    </div>
  );
}

export function IntegrationCard({ integration }: { integration: Integration }) {
  const live = integration.status === "live";
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-[#04322E]/10 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(4,50,46,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <IntegrationIcon integration={integration} className="h-11 w-11 rounded-xl bg-slate-50 ring-slate-200/70" iconClassName="h-6 w-6" />
        <StatusChip status={live ? "live" : "soon"} />
      </div>
      <p className="mt-4 font-heading font-semibold text-[#04322E]">{integration.name}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-[#0E8C7F]/80">{integration.category}</p>
      <p className="mt-2 text-sm leading-relaxed text-[#04322E]/60">{integration.description}</p>
    </div>
  );
}

export function IntegrationsGrid() {
  const liveCount = INTEGRATIONS.filter((i) => i.status === "live").length;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration, i) => (
          <FadeIn key={integration.id} delay={(i % 3) * 0.06}>
            <IntegrationCard integration={integration} />
          </FadeIn>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-[#04322E]/50">
        {liveCount === 1 ? "WhatsApp is live today." : `${liveCount} integrations are live today.`} More are rolling out —
        tell us which one you need next on the{" "}
        <a href="/contact" className="font-medium text-[#0E8C7F] underline underline-offset-2">
          contact page
        </a>
        .
      </p>
    </>
  );
}

/** AI as an intelligence layer across the CRM - clearly marked as not built yet. */
export function AiLayerSection({
  id,
  title = "Intelligence across your whole CRM",
}: {
  id?: string;
  title?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#063F3A] via-[#0B6E66] to-[#0E8C7F] px-6 py-12 text-white md:px-12">
        <SectionHeading
          light
          eyebrow="AI layer · Coming soon"
          title={title}
          subtitle="AI will work on top of your leads, deals and conversations — not as a separate tool. These features are in development and not available yet."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AI_CAPABILITIES.map((cap) => (
            <div key={cap.title} className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur">
              <Bot className="h-5 w-5 text-[#86EFAC]" aria-hidden />
              <p className="mt-3 font-heading font-semibold">{cap.title}</p>
              <p className="mt-1 text-sm text-teal-50/75">{cap.desc}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-teal-100/70">Coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The WhatsApp integration - live, real capabilities only. `showcase` adds a
 * real inbox screenshot and a sign-up CTA (used on the home page).
 */
export function WhatsAppSection({
  className = "",
  id,
  title = "WhatsApp, built into your CRM",
  showcase = false,
}: {
  className?: string;
  id?: string;
  title?: string;
  showcase?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-24 px-4 py-16 md:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <FadeIn>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              <FaWhatsapp className="h-3.5 w-3.5" aria-hidden /> Integration · Live
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-[#04322E] md:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#04322E]/60 md:text-lg">
              Connect your WhatsApp Business number through Meta&apos;s official platform to run campaigns and reply
              to customers from the same workspace as your leads and deals.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              {showcase && (
                <a
                  href="/login?mode=register"
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm ${accentButton}`}
                  data-testid="button-whatsapp-get-started"
                >
                  Get Started <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              )}
              <Link
                href="/setup-guide"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[#0E8C7F] transition-colors hover:text-[#04322E]"
              >
                How to connect WhatsApp <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            {showcase && (
              <ProductFrame shot={productShot("inbox")} className="mt-10 text-[#04322E]" />
            )}
          </FadeIn>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHATSAPP_CAPABILITIES.map((cap, i) => (
              <FadeIn key={cap.title} delay={i * 0.06}>
                <FeatureCard icon={cap.icon} title={cap.title} desc={cap.desc} />
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Light page hero + layout shell used by the inner marketing pages. */
export function MarketingPage({
  eyebrow,
  title,
  subtitle,
  children,
  cta = true,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  cta?: boolean;
}) {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden px-4 pb-14 pt-14 md:pb-20 md:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_85%_0%,rgba(20,184,166,0.14),transparent_70%)]" aria-hidden />
        <div className="relative mx-auto max-w-6xl">
          <FadeIn>
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0E8C7F] ring-1 ring-teal-100">
                {eyebrow}
              </p>
              <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-[#04322E] sm:text-4xl md:text-5xl">
                {title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-[#04322E]/60 sm:text-lg">{subtitle}</p>
            </div>
          </FadeIn>
        </div>
      </section>
      {children}
      {cta && (
        <section className="px-4 pb-16 md:pb-24">
          <div className="mx-auto max-w-5xl">
            <MarketingCta dark />
          </div>
        </section>
      )}
    </MarketingLayout>
  );
}

/** White band section wrapper. */
export function Band({ id, children, tinted = false }: { id?: string; children: ReactNode; tinted?: boolean }) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 px-4 py-16 md:py-24 ${tinted ? "border-y border-[#04322E]/10 bg-white" : ""}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
