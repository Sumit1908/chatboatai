import { Link } from "wouter";
import { ArrowRight, Bot, Check, LayoutDashboard } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { accentButton, accentGradientText } from "./brand";
import { ProductFrame, productShot } from "./product-frame";

export const DEFAULT_HERO_DESCRIPTION =
  "Manage leads, deals, follow-ups, tasks and WhatsApp conversations in one powerful CRM — with AI tools on the way to help your team work faster.";

const HERO_POINTS = [
  "Leads, deals and a visual sales pipeline",
  "Follow-ups and tasks so nothing slips",
  "WhatsApp inbox and campaigns built in",
];

/** Abstract line graphics + glows behind the hero. */
function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_78%_35%,rgba(94,234,212,0.28),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_50%_at_8%_90%,rgba(52,211,153,0.18),transparent_70%)]" />
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,black,transparent)]" />
    </div>
  );
}

export function CrmHero({ description = DEFAULT_HERO_DESCRIPTION }: { description?: string }) {
  return (
    <section className="relative -mt-14 overflow-hidden bg-gradient-to-br from-[#063F3A] via-[#0B6E66] to-[#0E8C7F] pt-14 text-white sm:-mt-16 sm:pt-16">
      <HeroBackdrop />
      <div className="relative mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pb-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 lg:pb-24 lg:pt-14">
        {/* Rendered without an entrance animation: this is the page's main
            content (and LCP element), so it must not wait on JS to appear. */}
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          {/* What ChatBoatAI is, at a glance: CRM + WhatsApp, AI coming soon. */}
          <ul className="flex flex-wrap justify-center gap-2 lg:justify-start" aria-label="ChatBoatAI includes">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-teal-50 backdrop-blur">
              <LayoutDashboard className="h-3.5 w-3.5 text-[#86EFAC]" aria-hidden /> CRM
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-teal-50 backdrop-blur">
              <FaWhatsapp className="h-3.5 w-3.5 text-[#86EFAC]" aria-hidden /> WhatsApp Business
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/25 px-3 py-1 text-xs font-medium text-teal-50/80">
              <Bot className="h-3.5 w-3.5" aria-hidden /> AI · coming soon
            </li>
          </ul>
          <h1 className="mt-5 font-heading text-[2.1rem] font-bold leading-[1.1] tracking-tight min-[400px]:text-[2.35rem] sm:text-5xl lg:text-[2.6rem] xl:text-[3.2rem]">
            CRM Management Software Built for{" "}
            <span className={accentGradientText}>Modern Sales Teams</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-teal-50/85 sm:text-lg">{description}</p>
          <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left lg:mx-0">
            {HERO_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[15px] text-white/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#34D399]/20 ring-1 ring-[#34D399]/50">
                  <Check className="h-3 w-3 text-[#86EFAC]" aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href="/login?mode=register"
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-[15px] ${accentButton}`}
              data-testid="button-start-free"
            >
              Get Started <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href="/crm"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-7 text-[15px] font-semibold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15"
              data-testid="button-explore-crm"
            >
              Explore CRM
            </Link>
          </div>
          <p className="mt-4 text-xs text-teal-50/70">Monthly plans · Secure payment with Razorpay</p>
        </div>

        <div className="crm-rise mx-auto w-full max-w-2xl text-teal-50 lg:max-w-none">
          <ProductFrame shot={productShot("dashboard")} priority />
        </div>
      </div>
    </section>
  );
}
