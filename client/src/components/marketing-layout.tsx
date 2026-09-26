import { Link, useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ArrowRight, Menu } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/marketing-content";
import { ContentSeo } from "@/components/seo-head";
import { BrandLogo, accentButton } from "@/components/crm/brand";

export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Call-to-action panel used at the end of public pages. */
export function MarketingCta({
  title = "Ready to run your CRM with ChatBoatAI?",
  subtitle = "Create your account, choose a plan and start managing leads, deals and follow-ups today.",
  ctaLabel = "Get Started",
  ctaHref = "/login?mode=register",
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const internal = ctaHref.startsWith("/") && !ctaHref.startsWith("/login");
  const className = `inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-7 sm:w-auto ${accentButton}`;
  const content = (
    <>
      {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
    </>
  );
  return (
    <div className="rounded-3xl border border-[#0E8C7F]/15 bg-teal-50/60 px-5 py-12 text-center sm:px-10 sm:py-14">
      <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</h2>
      <p className="mx-auto mb-8 mt-3 max-w-xl text-sm text-slate-600 md:text-base">{subtitle}</p>
      {internal ? (
        <Link href={ctaHref} className={className} data-testid="button-cta">
          {content}
        </Link>
      ) : (
        <a href={ctaHref} className={className} data-testid="button-cta">
          {content}
        </a>
      )}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <FadeIn>
      <div className={`mb-4 max-w-3xl ${centered ? "mx-auto text-center" : ""}`}>
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#0E8C7F]">{eyebrow}</p>
        )}
        <h1 className="mb-4 font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="text-base leading-relaxed text-slate-600 sm:text-lg">{subtitle}</p>}
      </div>
    </FadeIn>
  );
}

type Tone = "light" | "dark";

/** Site header (sticky; white, or dark on the home page). */
export function MarketingHeader({ tone = "light" }: { tone?: Tone }) {
  return (
    <div className="sticky top-0 z-50">
      <MarketingNav tone={tone} />
    </div>
  );
}

function isActive(location: string, href: string) {
  return !href.includes("#") && (location === href || location.startsWith(`${href}/`));
}

/** `/#section` links are plain anchors so they scroll natively (and work cross-page). */
function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (href.includes("#")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function MarketingNav({ tone }: { tone: Tone }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const dark = tone === "dark";

  const linkClass = (active: boolean) =>
    `text-sm font-medium transition-colors duration-200 ${
      dark
        ? active ? "text-white" : "text-slate-300 hover:text-white"
        : active ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <nav className={dark ? "border-b border-white/10 bg-slate-950/80 backdrop-blur-xl" : "border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"}>
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" aria-label="ChatBoatAI home">
          <BrandLogo tone={dark ? "light" : "dark"} className="cursor-pointer" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {PRIMARY_NAV.map(({ href, label }) => (
            <NavLink key={href} href={href} className={linkClass(isActive(location, href))}>
              {label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/login"
            data-testid="nav-login"
            className={`hidden h-9 items-center rounded-lg px-3 text-sm font-semibold transition-colors sm:inline-flex ${
              dark ? "text-slate-200 hover:bg-white/10 hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Login
          </a>
          <a
            href="/login?mode=register"
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm sm:px-4 ${accentButton}`}
            data-testid="nav-get-started"
          >
            Get Started
          </a>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-9 w-9 shrink-0 md:hidden ${
                  dark ? "border-white/15 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white" : "border-slate-200 text-slate-700"
                }`}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(100vw-2rem,320px)] flex-col p-0">
              <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
                <SheetTitle>
                  <BrandLogo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                  {PRIMARY_NAV.map(({ href, label }) => (
                    <li key={href}>
                      <SheetClose asChild>
                        <NavLink
                          href={href}
                          className={`flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                            isActive(location, href)
                              ? "bg-teal-50 text-slate-900"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          {label}
                        </NavLink>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="space-y-2 border-t border-slate-200 p-4">
                <SheetClose asChild>
                  <a href="/login" className="block">
                    <Button variant="outline" className="w-full border-slate-200 text-slate-800">
                      Login
                    </Button>
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a
                    href="/login?mode=register"
                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm ${accentButton}`}
                  >
                    Get Started <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter({ tone = "light" }: { tone?: Tone }) {
  const dark = tone === "dark";
  const linkClass = dark ? "hover:text-white" : "hover:text-slate-900";
  const headingClass = `mb-4 text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`;
  const listClass = `space-y-2 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`;
  return (
    <footer className={`border-t px-4 py-10 sm:py-12 ${dark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}>
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo tone={dark ? "light" : "dark"} className="mb-4" />
            <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
              ChatBoatAI CRM - CRM software with custom setup, configuration and integration support.
            </p>
          </div>
          <div>
            <p className={headingClass}>Product</p>
            <ul className={listClass}>
              {PRIMARY_NAV.map(({ href, label }) => (
                <li key={href}>
                  <NavLink href={href} className={linkClass}>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={headingClass}>Account</p>
            <ul className={listClass}>
              <li><a href="/login" className={linkClass}>Login</a></li>
              <li><a href="/login?mode=register" className={linkClass}>Sign Up</a></li>
            </ul>
          </div>
          <div>
            <p className={headingClass}>Legal</p>
            <ul className={listClass}>
              <li><Link href="/terms" title="ChatBoatAI Terms of Service" className={linkClass}>Terms of Service</Link></li>
              <li><Link href="/privacy" title="ChatBoatAI Privacy Policy" className={linkClass}>Privacy Policy</Link></li>
              <li><Link href="/refund" title="ChatBoatAI Refund Policy" className={linkClass}>Refund Policy</Link></li>
              <li><Link href="/delete-data" title="Request user data deletion" className={linkClass}>Data Deletion</Link></li>
            </ul>
          </div>
        </div>
        <div className={`mt-8 border-t pt-6 text-center text-xs sm:text-left sm:text-sm ${dark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
          <p>&copy; {new Date().getFullYear()} ChatBoatAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="relative min-h-screen bg-white text-slate-900 selection:bg-teal-200/60">
      <ContentSeo path={location} />
      <MarketingHeader />
      <div className="overflow-x-clip">{children}</div>
      <MarketingFooter />
    </div>
  );
}
