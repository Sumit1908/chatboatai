import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
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
import { Phone, ArrowRight, Menu, LayoutDashboard } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import {
  HELP_NUMBER,
  PRIMARY_NAV,
  RESOURCES_NAV,
  EMAIL_INFO,
  EMAIL_SUPPORT,
} from "@/lib/marketing-content";
import { ContentSeo } from "@/components/seo-head";
import { SocialShare } from "@/components/social-share";
import { BrandLogo, CRM, accentButton } from "@/components/crm/brand";

/** Section padding — tighter on mobile, unchanged from md/lg up */
export const sectionPad = "py-16 md:py-20 lg:py-24 px-4";
export const sectionPadSm = "py-14 md:py-20 px-4";
export const heroPad = "pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-20 px-4";

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
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** WhatsApp glyph — for WhatsApp-specific content only (not the brand logo). */
export function WaMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-md shadow-[#25D366]/30 ${className}`}
      role="img"
      aria-label="WhatsApp"
    >
      <FaWhatsapp className="h-[58%] w-[58%]" aria-hidden />
    </div>
  );
}

export function MarketingCta({
  title = "Run your whole business from one dashboard",
  subtitle = "Choose a plan, pay securely with Razorpay and bring in your leads, pipeline and channels this week.",
  dark = false,
  ctaLabel = "Get Started",
}: {
  title?: string;
  subtitle?: string;
  dark?: boolean;
  ctaLabel?: string;
}) {
  return (
    <div
      className={`rounded-3xl border px-4 sm:px-6 md:px-12 py-10 sm:py-14 text-center relative overflow-hidden ${
        dark
          ? "border-white/10 bg-gradient-to-br from-[#063F3A] via-[#0B6E66] to-[#0E8C7F] text-white"
          : "border-[#0E8C7F]/20 bg-white/90 text-[#04322E]"
      }`}
    >
      {dark && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_100%,rgba(94,234,212,0.3),transparent)]" />
      )}
      <div className="relative">
        <span
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
            dark ? "bg-white/10 text-[#86EFAC]" : "bg-teal-50 text-[#0E8C7F]"
          }`}
        >
          <LayoutDashboard className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3">{title}</h2>
        <p className={`text-sm md:text-base mb-8 max-w-lg mx-auto ${dark ? "text-teal-50/75" : "text-[#04322E]/60"}`}>
          {subtitle}
        </p>
        <a
          href="/login?mode=register"
          className={`inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-7 ${accentButton}`}
          data-testid="button-cta-get-started"
        >
          {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
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
      <div className={`max-w-3xl ${centered ? "mx-auto text-center" : ""} mb-4`}>
        {eyebrow && (
          <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0E8C7F] ring-1 ring-teal-100 mb-4">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-[#04322E] mb-4 leading-tight">{title}</h1>
        {subtitle && <p className="text-base sm:text-lg text-[#04322E]/60 leading-relaxed">{subtitle}</p>}
      </div>
    </FadeIn>
  );
}

function MarketingHelpBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={
        dark
          ? "relative z-[60] border-b border-white/10 bg-[#04322E] text-teal-50/80"
          : "border-b border-[#04322E]/10 bg-white/70 backdrop-blur-md text-[#04322E]/75"
      }
    >
      <div className="text-center text-xs sm:text-sm py-2 px-3 sm:px-4 leading-snug">
        <Phone className={`inline h-3.5 w-3.5 mr-1.5 -mt-0.5 ${dark ? "text-[#5EEAD4]" : "text-[#0E8C7F]"}`} aria-hidden />
        <span className="hidden sm:inline">Talk to our team: </span>
        <a
          href={`tel:+91${HELP_NUMBER}`}
          className={`font-semibold underline underline-offset-2 whitespace-nowrap ${
            dark ? "text-white decoration-[#5EEAD4]/60" : "text-[#04322E] decoration-[#0E8C7F]/60"
          }`}
        >
          +91 {HELP_NUMBER}
        </a>
      </div>
    </div>
  );
}

/**
 * Site header. `overlay` renders it transparent with white text over a dark
 * hero (home page) until the visitor scrolls, then it turns solid white.
 */
export function MarketingHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <>
      <MarketingHelpBar dark={overlay} />
      <div className="sticky top-0 z-50">
        <MarketingNav overlay={overlay} />
      </div>
    </>
  );
}

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
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

function MarketingNav({ overlay }: { overlay: boolean }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const onDark = overlay && !scrolled;

  const linkClass = (active: boolean) =>
    `relative text-sm font-medium transition-colors duration-200 after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:rounded-full after:transition-all after:duration-200 ${
      onDark
        ? `after:bg-[#5EEAD4] ${active ? "text-white after:w-full" : "text-white/75 hover:text-white after:w-0 hover:after:w-full"}`
        : `after:bg-[#0E8C7F] ${active ? "text-[#04322E] after:w-full" : "text-[#04322E]/65 hover:text-[#04322E] after:w-0 hover:after:w-full"}`
    }`;

  return (
    <nav
      className={`transition-colors duration-300 ${
        onDark
          ? "border-b border-transparent bg-transparent"
          : "border-b border-[#04322E]/10 bg-white/90 backdrop-blur-xl shadow-[0_1px_0_rgba(4,50,46,0.02)]"
      }`}
    >
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 px-3 sm:px-4 max-w-[1320px]">
        <Link href="/" aria-label="ChatBoatAI home">
          <BrandLogo tone={onDark ? "light" : "dark"} className="cursor-pointer" />
        </Link>

        <div className="hidden lg:flex items-center gap-6 xl:gap-7">
          {PRIMARY_NAV.map(({ href, label }) => (
            <NavLink key={href} href={href} className={linkClass(isActive(location, href))}>
              {label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <a
            href="/login"
            data-testid="nav-login"
            className={`hidden sm:inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold transition-colors ${
              onDark ? "text-white hover:bg-white/10" : "text-[#04322E] hover:bg-teal-50"
            }`}
          >
            Login
          </a>
          <a
            href="/login?mode=register"
            className={`hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm ${accentButton}`}
            data-testid="nav-get-started"
          >
            Get Started <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </a>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`lg:hidden shrink-0 h-9 w-9 ${
                  onDark
                    ? "border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                    : "border-[#04322E]/15 text-[#04322E]"
                }`}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,320px)] p-0 flex flex-col">
              <SheetHeader className="border-b border-[#04322E]/10 px-5 py-4 text-left">
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
                              ? "bg-teal-50 text-[#04322E]"
                              : "text-[#04322E]/70 hover:bg-[#04322E]/5 hover:text-[#04322E]"
                          }`}
                        >
                          {label}
                        </NavLink>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#04322E]/40">
                  Resources
                </p>
                <ul className="space-y-1">
                  {RESOURCES_NAV.map(({ href, label }) => (
                    <li key={href}>
                      <SheetClose asChild>
                        <Link
                          href={href}
                          className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            isActive(location, href)
                              ? "bg-teal-50 text-[#04322E]"
                              : "text-[#04322E]/70 hover:bg-[#04322E]/5 hover:text-[#04322E]"
                          }`}
                        >
                          {label}
                        </Link>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="border-t border-[#04322E]/10 p-4 space-y-2">
                <SheetClose asChild>
                  <a href="/login" className="block">
                    <Button variant="outline" className="w-full border-[#04322E]/15 text-[#04322E]">
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

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#04322E]/10 py-10 sm:py-12 px-4 bg-white/70">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo className="mb-4" />
            <p className="text-sm text-[#04322E]/55">
              CRM for leads, deals, follow-ups and tasks — with WhatsApp Business built in and AI tools on the way.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-4 text-[#04322E] text-sm">Product</p>
            <ul className="space-y-2 text-sm text-[#04322E]/55">
              {PRIMARY_NAV.map(({ href, label }) => (
                <li key={href}>
                  <NavLink href={href} className="hover:text-[#04322E]">
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-4 text-[#04322E] text-sm">Resources</p>
            <ul className="space-y-2 text-sm text-[#04322E]/55">
              {RESOURCES_NAV.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-[#04322E]">
                    {label}
                  </Link>
                </li>
              ))}
              <li><Link href="/use-cases" className="hover:text-[#04322E]">Use Cases</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-4 text-[#04322E] text-sm">Company</p>
            <ul className="space-y-2 text-sm text-[#04322E]/55">
              <li><Link href="/contact" className="hover:text-[#04322E]">Contact</Link></li>
              <li><a href="/login" className="hover:text-[#04322E]">Login</a></li>
              <li><a href="/login?mode=register" className="hover:text-[#04322E]">Get Started</a></li>
              <li>
                <a href={`tel:+91${HELP_NUMBER}`} className="hover:text-[#04322E] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#0E8C7F]" /> +91 {HELP_NUMBER}
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL_INFO}`} className="hover:text-[#04322E] break-all">
                  {EMAIL_INFO}
                </a>
              </li>
              {EMAIL_SUPPORT !== EMAIL_INFO && (
                <li>
                  <a href={`mailto:${EMAIL_SUPPORT}`} className="hover:text-[#04322E] break-all">
                    {EMAIL_SUPPORT}
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-4 text-[#04322E] text-sm">Legal</p>
            <ul className="space-y-2 text-sm text-[#04322E]/55">
              <li><Link href="/terms" title="ChatBoatAI Terms of Service" className="hover:text-[#04322E]">Terms of Service</Link></li>
              <li><Link href="/privacy" title="ChatBoatAI Privacy Policy" className="hover:text-[#04322E]">Privacy Policy</Link></li>
              <li><Link href="/refund" title="ChatBoatAI Refund Policy" className="hover:text-[#04322E]">Refund Policy</Link></li>
              <li><Link href="/delete-data" title="Request user data deletion" className="hover:text-[#04322E]">Data Deletion</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#04322E]/10 mt-8 pt-8 flex flex-col gap-4">
          <SocialShare />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-[#04322E]/45 text-center sm:text-left">
            <p>&copy; {new Date().getFullYear()} ChatBoatAI. All rights reserved.</p>
            <p className="inline-flex items-center gap-1.5">
              <FaWhatsapp className="h-3.5 w-3.5 text-[#25D366]" aria-hidden /> WhatsApp integration built on the official{" "}
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                target="_blank"
                rel="noopener noreferrer"
                title="Meta WhatsApp Cloud API documentation"
                className="underline underline-offset-2 hover:text-[#04322E]"
              >
                Meta Business Platform
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div
      className="relative min-h-screen text-[#04322E] selection:bg-teal-200/60"
      style={{ backgroundColor: CRM.mist }}
    >
      <ContentSeo path={location} />
      <div
        className="pointer-events-none fixed inset-0 -z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(20,184,166,0.16), transparent 50%), linear-gradient(180deg, rgba(244,251,249,0.45) 0%, rgba(244,251,249,0.78) 55%, #F4FBF9 100%)",
        }}
      />
      <MarketingHeader />
      <div className="overflow-x-clip">{children}</div>
      <MarketingFooter />
    </div>
  );
}
