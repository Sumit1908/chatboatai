import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { accentButton } from "./brand";
import { ProductFrame, productShot } from "./product-frame";

export const DEFAULT_HERO_DESCRIPTION =
  "Create, manage and scale your CRM from one powerful platform — from leads and customers to sales pipelines, teams, follow-ups and integrations.";

export function CrmHero({ description = DEFAULT_HERO_DESCRIPTION }: { description?: string }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-teal-50/60 to-white">
      <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pb-16 pt-12 md:pb-20 md:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 lg:pb-24 lg:pt-20">
        {/* No entrance animation: this is the page's main content (and LCP element). */}
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0E8C7F]">CRM software &amp; CRM setup</p>
          <h1 className="mt-4 font-heading text-[2.1rem] font-bold leading-[1.1] tracking-tight text-slate-900 min-[400px]:text-[2.35rem] sm:text-5xl lg:text-[2.75rem] xl:text-[3.1rem]">
            Build &amp; Manage Your Complete CRM with <span className="text-[#0E8C7F]">ChatBoatAI</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">{description}</p>
          <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
            Need a custom CRM setup? We can configure, integrate and manage your CRM around your business workflow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href="/login?mode=register"
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-[15px] ${accentButton}`}
              data-testid="button-start-free"
            >
              Get Started <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-7 text-[15px] font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
              data-testid="button-view-pricing"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Already have an account?{" "}
            <a href="/login" className="font-semibold text-[#0E8C7F] hover:underline" data-testid="hero-login">
              Log in
            </a>
          </p>
        </div>

        <div className="crm-rise mx-auto w-full max-w-2xl text-slate-500 lg:max-w-none">
          <ProductFrame shot={productShot("dashboard")} priority />
        </div>
      </div>
    </section>
  );
}
