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
import { Phone, ArrowRight, Menu } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { HELP_NUMBER, MARKETING_NAV, WA, EMAIL_INFO, EMAIL_SUPPORT } from "@/lib/marketing-content";
import { ContentSeo } from "@/components/seo-head";
import { SocialShare } from "@/components/social-share";

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

export function WaMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-md shadow-[#25D366]/30 ${className}`}
      role="img"
      aria-label="ChatBoatAI WhatsApp logo"
    >
      <FaWhatsapp className="h-[58%] w-[58%]" aria-hidden />
    </div>
  );
}

export function MarketingCta({
  title = "Ready to launch on WhatsApp?",
  subtitle = "Start your free trial, connect your number, and send your first campaign this week.",
  dark = false,
}: {
  title?: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border px-4 sm:px-6 md:px-12 py-10 sm:py-14 text-center relative overflow-hidden ${
        dark
          ? "border-[#25D366]/40 bg-[#075E54] text-white"
          : "border-[#25D366]/30 bg-white/90 text-[#075E54]"
      }`}
    >
      {dark && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_100%,rgba(37,211,102,0.35),transparent)]" />
      )}
      <div className="relative">
        <FaWhatsapp className={`h-10 w-10 mx-auto mb-4 ${dark ? "text-[#25D366]" : "text-[#25D366]"}`} />
        <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3">{title}</h2>
        <p className={`text-sm md:text-base mb-8 max-w-lg mx-auto ${dark ? "text-white/70" : "text-[#075E54]/60"}`}>
          {subtitle}
        </p>
        <a href="/login" className="inline-block w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/30"
          >
            <FaWhatsapp className="h-5 w-5" /> Start Free Trial <ArrowRight className="h-4 w-4" />
          </Button>
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
          <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3 flex items-center gap-2 justify-center md:justify-start">
            <FaWhatsapp className="h-4 w-4" /> {eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-[#075E54] mb-4 leading-tight">{title}</h1>
        {subtitle && <p className="text-base sm:text-lg text-[#075E54]/60 leading-relaxed">{subtitle}</p>}
      </div>
    </FadeIn>
  );
}

function MarketingHelpBar() {
  return (
    <div className="border-b border-[#075E54]/10 bg-white/70 backdrop-blur-md">
      <div className="text-center text-xs sm:text-sm py-2 px-3 sm:px-4 text-[#075E54]/75 leading-snug">
        <FaWhatsapp className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-[#25D366]" />
        <span className="hidden sm:inline">Need help? </span>
        Call{" "}
        <a
          href={`tel:+91${HELP_NUMBER}`}
          className="font-semibold text-[#075E54] underline underline-offset-2 decoration-[#25D366]/70 whitespace-nowrap"
        >
          +91 {HELP_NUMBER}
        </a>
      </div>
    </div>
  );
}

export function MarketingHeader() {
  return (
    <>
      <MarketingHelpBar />
      <div className="sticky top-0 z-50">
        <MarketingNav />
      </div>
    </>
  );
}

function MarketingNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-[#075E54]/10 bg-white/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 px-3 sm:px-4 max-w-6xl">
        <Link href="/">
          <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer min-w-0">
            <WaMark className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
            <span className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[#075E54] truncate">
              ChatBoatAI
            </span>
          </div>
        </Link>
        <div className="hidden xl:flex items-center gap-5">
          {MARKETING_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              title={`${label} — ChatBoatAI WhatsApp Business API`}
              className={`text-sm font-medium transition-colors ${
                location === href ? "text-[#075E54]" : "text-[#075E54]/60 hover:text-[#075E54]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <a href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-[#075E54] hover:bg-[#25D366]/10">
              Log In
            </Button>
          </a>
          <a href="/login" className="hidden sm:block">
            <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-md shadow-[#25D366]/25 gap-1.5">
              <FaWhatsapp className="h-4 w-4" /> Get Started
            </Button>
          </a>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="xl:hidden shrink-0 border-[#075E54]/15 text-[#075E54] h-9 w-9"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,320px)] p-0 flex flex-col">
              <SheetHeader className="border-b border-[#075E54]/10 px-5 py-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-[#075E54]">
                  <WaMark className="h-8 w-8" />
                  <span className="font-heading font-bold">ChatBoatAI</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                  {MARKETING_NAV.map(({ href, label }) => (
                    <li key={href}>
                      <SheetClose asChild>
                        <Link
                          href={href}
                          className={`flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                            location === href
                              ? "bg-[#25D366]/12 text-[#075E54]"
                              : "text-[#075E54]/70 hover:bg-[#075E54]/5 hover:text-[#075E54]"
                          }`}
                        >
                          {label}
                        </Link>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="border-t border-[#075E54]/10 p-4 space-y-2">
                <SheetClose asChild>
                  <a href={"/login"} className="block">
                    <Button variant="outline" className="w-full border-[#075E54]/15 text-[#075E54]">
                      Log In
                    </Button>
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href={"/login"} className="block">
                    <Button className="w-full bg-[#25D366] text-white hover:bg-[#20bd5a] gap-2">
                      <FaWhatsapp className="h-4 w-4" /> Get Started
                    </Button>
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

function MarketingFooter() {
  return (
    <footer className="border-t border-[#075E54]/10 py-10 sm:py-12 px-4 bg-white/70">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <WaMark className="h-8 w-8" />
              <span className="font-heading font-bold text-[#075E54]">ChatBoatAI</span>
            </div>
            <p className="text-sm text-[#075E54]/50">
              The WhatsApp Business API platform for teams that sell in conversations.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-4 text-[#075E54] text-sm">Product</p>
            <ul className="space-y-2 text-sm text-[#075E54]/50">
              {MARKETING_NAV.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} title={`${label} — ChatBoatAI`} className="hover:text-[#075E54]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-4 text-[#075E54] text-sm">Legal</p>
            <ul className="space-y-2 text-sm text-[#075E54]/50">
              <li><Link href="/privacy" title="ChatBoatAI Privacy Policy" className="hover:text-[#075E54]">Privacy Policy</Link></li>
              <li><Link href="/terms" title="ChatBoatAI Terms of Service" className="hover:text-[#075E54]">Terms of Service</Link></li>
              <li><Link href="/refund" title="ChatBoatAI Refund Policy" className="hover:text-[#075E54]">Refund Policy</Link></li>
              <li><Link href="/delete-data" title="Request user data deletion" className="hover:text-[#075E54]">Data Deletion</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-4 text-[#075E54] text-sm">Support</p>
            <ul className="space-y-2 text-sm text-[#075E54]/50">
              <li><Link href="/contact" className="hover:text-[#075E54]">Contact Us</Link></li>
              <li>
                <a href={`tel:+91${HELP_NUMBER}`} className="hover:text-[#075E54] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#25D366]" /> +91 {HELP_NUMBER}
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL_INFO}`} className="hover:text-[#075E54]">
                  {EMAIL_INFO}
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL_SUPPORT}`} className="hover:text-[#075E54]">
                  {EMAIL_SUPPORT}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#075E54]/10 mt-8 pt-8 flex flex-col gap-4">
          <SocialShare />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-[#075E54]/40 text-center sm:text-left">
            <p>&copy; {new Date().getFullYear()} ChatBoatAI. All rights reserved.</p>
            <p className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 max-w-md sm:max-w-none">
              <span className="inline-flex items-center gap-1.5">
                <FaWhatsapp className="h-3.5 w-3.5 text-[#25D366]" /> Built on the official{" "}
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Meta WhatsApp Cloud API documentation"
                  className="underline underline-offset-2 hover:text-[#075E54]"
                >
                  Meta WhatsApp Business Platform
                </a>
              </span>
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
      className="relative min-h-screen text-[#075E54] selection:bg-[#25D366]/30"
      style={{ backgroundColor: WA.mist }}
    >
      <ContentSeo path={location} />
      <div
        className="pointer-events-none fixed inset-0 -z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(37,211,102,0.18), transparent 50%), linear-gradient(180deg, rgba(247,251,248,0.45) 0%, rgba(247,251,248,0.78) 55%, #F7FBF8 100%)",
        }}
      />
      <MarketingHeader />
      <div className="overflow-x-clip">{children}</div>
      <MarketingFooter />
    </div>
  );
}
