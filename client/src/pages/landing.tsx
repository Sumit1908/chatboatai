import { Link } from "wouter";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Users,
  BarChart3,
  Shield,
  Check,
  ArrowRight,
  Phone,
  Inbox,
  Send,
  FileText,
  RefreshCw,
  Lock,
  BadgeCheck,
  Headphones,
  Star,
  Eye,
  Server,
  Clock,
  Search,
  MoreVertical,
  CheckCheck,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { AnimatedSection } from "@/components/section-backdrop";
import { TrustBadgeBanner } from "@/components/trust-badges";
import { MARKETING_NAV, HELP_NUMBER } from "@/lib/marketing-content";
import { MarketingHeader } from "@/components/marketing-layout";
import { ContentSeo } from "@/components/seo-head";
import { SocialShare } from "@/components/social-share";
import { toMarketingPlanCards, usePublicPlans } from "@/hooks/use-public-plans";
import { Skeleton } from "@/components/ui/skeleton";

const ScrollScene = lazy(() =>
  import("@/components/scroll-scene").then((m) => ({ default: m.ScrollScene })),
);

const WA = {
  green: "#25D366",
  teal: "#128C7E",
  dark: "#075E54",
  light: "#DCF8C6",
  chat: "#ECE5DD",
  mist: "#F7FBF8",
};

function FadeIn({
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

const features = [
  {
    icon: Send,
    title: "Broadcast campaigns",
    desc: "Send offers, launches and event invites to thousands of opted-in contacts in minutes — with per-campaign delivery tracking.",
  },
  {
    icon: FileText,
    title: "Template manager",
    desc: "Create, submit and track Meta template approvals from the dashboard. Buttons, media headers and variables included.",
  },
  {
    icon: Inbox,
    title: "Shared team inbox",
    desc: "Every reply lands in one inbox your whole team can work from — assign chats, add notes and never miss a hot lead.",
  },
  {
    icon: Users,
    title: "Contact management",
    desc: "Import contacts, tag by project or interest, segment audiences and keep opt-in status clean and compliant.",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    desc: "Sent, delivered, read and failed — tracked live per message and per campaign, so you know exactly what's working.",
  },
  {
    icon: RefreshCw,
    title: "Meta API sync",
    desc: "One-click sync keeps your quality rating, messaging limits and template statuses up to date, straight from Meta.",
  },
];

const steps = [
  {
    n: "01",
    title: "Connect your Meta API",
    desc: "Link your WhatsApp Business account with guided embedded signup. We handle the technical setup end-to-end.",
  },
  {
    n: "02",
    title: "Create your templates",
    desc: "Build message templates with media, variables and call-to-action buttons, then submit them to Meta for approval in-app.",
  },
  {
    n: "03",
    title: "Launch & track campaigns",
    desc: "Pick your audience, schedule the broadcast, and watch delivery and read rates update in real time.",
  },
];

const useCases = [
  {
    tag: "Real estate",
    title: "Developers & brokers",
    desc: "From new-launch blasts to site-visit reminders and possession updates.",
    items: [
      "Project launch broadcasts with brochures",
      "Lead follow-up sequences from Meta ads",
      "Channel-partner event invites",
    ],
  },
  {
    tag: "D2C & retail",
    title: "Stores & e-commerce",
    desc: "Recover carts, announce sales and confirm orders where customers read.",
    items: [
      "Order & delivery notifications",
      "Festive offer campaigns",
      "Abandoned-cart nudges",
    ],
  },
  {
    tag: "Agencies",
    title: "Marketing agencies",
    desc: "Run WhatsApp as a managed service for your clients under one roof.",
    items: [
      "Multi-client campaign management",
      "Client-ready delivery reports",
      "Team inbox with assignments",
    ],
  },
];

const faqs = [
  {
    q: "Is this the official WhatsApp Business API?",
    a: "Yes. ChatBoatAI runs entirely on the official Meta WhatsApp Business Platform. Your number gets a verified business profile, and there's no risk of the bans that come with unofficial bulk-sender tools.",
  },
  {
    q: "Do I need a new phone number?",
    a: "You can use a fresh number or migrate an existing WhatsApp Business number. A number connected to the API can't be used in the regular WhatsApp app at the same time, so most teams dedicate a number to it.",
  },
  {
    q: "What are Meta conversation charges?",
    a: "Meta charges a small per-conversation fee for messages sent via the API, based on category (marketing, utility, authentication). These are billed at Meta's actual rates with no markup from us — your plan fee only covers the platform.",
  },
  {
    q: "How fast do templates get approved?",
    a: "Most templates are reviewed by Meta within minutes to a few hours. ChatBoatAI shows the live approval status of every template, and our team helps you fix rejected ones.",
  },
  {
    q: "Can my whole team use one number?",
    a: "Yes — that's the point of the shared inbox. Multiple teammates can read, reply to and assign conversations on the same WhatsApp number, with full history visible to everyone.",
  },
  {
    q: "Is there a free trial?",
    a: "Every plan comes with a free trial. Connect your number, send real campaigns and see the analytics before you pay anything.",
  },
];

const trustPillars = [
  {
    icon: BadgeCheck,
    title: "Official Meta WhatsApp API",
    desc: "No grey-market gateways. Your messages go through Meta’s Cloud API with a verified business profile.",
  },
  {
    icon: Lock,
    title: "Your data stays yours",
    desc: "Contacts and conversations belong to your workspace. We don’t sell audience data or resell your leads.",
  },
  {
    icon: Eye,
    title: "Full delivery transparency",
    desc: "See sent, delivered, read and failed in real time — so you always know what customers actually received.",
  },
  {
    icon: Server,
    title: "Built for reliability",
    desc: "Queue-backed sending, Meta rate-limit awareness, and campaign reports you can share with stakeholders.",
  },
];

const testimonials = [
  {
    quote:
      "We moved off spreadsheet broadcasts in a week. Delivery reports finally made WhatsApp feel like a real channel — not a gamble.",
    name: "Ananya R.",
    role: "Growth lead, D2C brand",
  },
  {
    quote:
      "Template approvals and the shared inbox alone paid for the plan. Our brokers actually reply from one place now.",
    name: "Vikram S.",
    role: "Sales ops, real estate",
  },
  {
    quote:
      "Clients ask for WhatsApp delivery proofs. ChatBoatAI gives us clean campaign reports without custom tooling.",
    name: "Neha M.",
    role: "Agency founder",
  },
];

const guarantees = [
  {
    icon: Shield,
    title: "No unofficial tools",
    desc: "We never use banned multi-device or scraped WhatsApp clients. Ban risk stays with unofficial tools — not us.",
  },
  {
    icon: Clock,
    title: "Try before you pay",
    desc: "Free trial on every plan. Connect your number, send real campaigns, then decide.",
  },
  {
    icon: Headphones,
    title: "Humans when you need them",
    desc: "WhatsApp and call support for setup, template fixes, and campaign questions — not just a chatbot.",
  },
];

const heroChatMessages = [
  {
    id: "out-1",
    side: "out" as const,
    text:
      "Hi Priya! Premium retail shops are now open for booking from ₹28L. Want the brochure and current price list?",
    time: "10:14",
  },
  {
    id: "in-1",
    side: "in" as const,
    text: "Yes, please share the brochure. Also let me know if a corner unit is available.",
    time: "10:15",
  },
  {
    id: "out-2",
    side: "out" as const,
    text:
      "Sent. Corner inventory is available right now. I can arrange a callback in 10 mins or book a site visit for tomorrow.",
    time: "10:15",
  },
];

function WaMark({ className = "h-9 w-9" }: { className?: string }) {
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

export default function Landing() {
  const { data: plansData, isLoading: plansLoading } = usePublicPlans();
  const plans = toMarketingPlanCards(plansData?.plans ?? []);
  const [showScene, setShowScene] = useState(false);

  // Admin-editable via Admin -> Website Content (see admin-website-content.tsx).
  // Falls back to the copy below whenever unset, so this page's appearance
  // does not change until an admin actually edits it.
  const { data: websiteSettings } = useQuery<{ heroDescription?: string | null } | null>({
    queryKey: ["/api/website-settings"],
  });
  const heroDescription =
    websiteSettings?.heroDescription?.trim() ||
    "Broadcast campaigns, approved templates, a shared team inbox and real-time delivery analytics — everything your business needs to sell, support and follow up on WhatsApp, from one dashboard.";

  useEffect(() => {
    // Defer Three.js scene until the browser is idle so first paint / TTI stay fast.
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    if (typeof win.requestIdleCallback === "function") {
      idleId = win.requestIdleCallback(() => setShowScene(true), { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(() => setShowScene(true), 1200);
    }
    return () => {
      if (idleId != null && typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      className="relative min-h-screen text-[#075E54] selection:bg-[#25D366]/30"
      style={{ backgroundColor: WA.mist }}
    >
      <ContentSeo path="/" />
      {showScene && (
        <Suspense fallback={null}>
          <ScrollScene />
        </Suspense>
      )}

      <div
        className="pointer-events-none fixed inset-0 -z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(37,211,102,0.18), transparent 50%), linear-gradient(180deg, rgba(247,251,248,0.45) 0%, rgba(247,251,248,0.78) 55%, #F7FBF8 100%)",
        }}
      />

      <MarketingHeader />

      <div className="overflow-x-clip">
      {/* Hero */}
      <AnimatedSection variant="spark" intensity="bold" className="pt-12 pb-14 md:pt-20 md:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/35 bg-[#25D366]/10 px-4 py-1.5 text-sm text-[#075E54] mb-8">
                <FaWhatsapp className="h-4 w-4 text-[#25D366]" />
                Official Meta WhatsApp Business API
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6 tracking-tight text-[#075E54]">
                Turn WhatsApp into your{" "}
                <span className="bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] bg-clip-text text-transparent">
                  #1 revenue channel
                </span>
              </h1>
              <p className="text-lg md:text-xl text-[#075E54]/65 max-w-xl mb-10 leading-relaxed">
                {heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-10">
                <a href={"/login"} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gap-2 bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/30"
                    data-testid="button-start-free"
                  >
                    <FaWhatsapp className="h-5 w-5" /> Start Free Trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <a href="#how-it-works" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-[#075E54]/20 bg-white/70 text-[#075E54] hover:bg-white hover:border-[#25D366]/50"
                  >
                    See How It Works
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-[#075E54]/55 mb-10">
                {["90%+ delivery rate", "No-code setup", "Cancel anytime"].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#25D366]" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative flex justify-center"
            >
              <div className="absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 rounded-xl border border-[#075E54]/10 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm sm:block">
                <p className="text-[10px] uppercase tracking-wide text-[#075E54]/45">Messages sent</p>
                <p className="text-xl font-heading font-semibold text-[#075E54]">7,839</p>
                <p className="text-[11px] text-[#128C7E] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" /> live campaign
                </p>
              </div>
              <div className="absolute -bottom-4 -right-4 md:-right-10 z-10 rounded-xl border border-[#075E54]/10 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-xl hidden sm:block">
                <p className="text-[10px] uppercase tracking-wide text-[#075E54]/45">Delivery rate</p>
                <p className="text-xl font-heading font-semibold text-[#075E54]">90.8%</p>
                <p className="text-[11px] text-[#128C7E]">quality: high</p>
              </div>

              <div className="mx-auto w-full max-w-[min(100%,320px)] overflow-hidden rounded-[2rem] border border-[#075E54]/10 bg-white shadow-2xl shadow-[#25D366]/15 lg:mx-0">
                <div className="flex items-center gap-2.5 bg-[#0b6157] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]">
                    <FaWhatsapp className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-white">Your Business</p>
                    <p className="text-xs text-[#dcf8c6]">online now</p>
                  </div>
                  <Search className="h-4 w-4 text-white/85" />
                  <MoreVertical className="h-4 w-4 text-white/85" />
                </div>
                <div
                  className="space-y-3 p-4 text-left"
                  style={{
                    backgroundColor: WA.chat,
                    backgroundImage:
                      "radial-gradient(rgba(7,94,84,0.05) 1px, transparent 1px), radial-gradient(rgba(7,94,84,0.04) 1px, transparent 1px)",
                    backgroundPosition: "0 0, 12px 12px",
                    backgroundSize: "24px 24px",
                  }}
                >
                  <div className="flex justify-center">
                    <div className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#075E54]/55 shadow-sm">
                      Today
                    </div>
                  </div>
                  {heroChatMessages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      className={`flex ${message.side === "out" ? "justify-end" : "justify-start"}`}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.55,
                        delay: index * 1.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                          message.side === "out"
                            ? "rounded-tr-sm bg-[#dcf8c6]"
                            : "rounded-tl-sm bg-white"
                        }`}
                      >
                        <p className="text-sm leading-snug text-[#075E54]">{message.text}</p>
                        <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-[#128C7E]/85">
                          <span>{message.time}</span>
                          {message.side === "out" && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <motion.div
                    className="flex justify-end"
                    initial={{ opacity: 0.35 }}
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="rounded-full bg-white/70 px-3 py-1.5 text-[11px] text-[#075E54]/60 shadow-sm">
                      typing...
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Trust strip + badges */}
      <AnimatedSection variant="grid" intensity="subtle" className="border-y border-[#075E54]/10 bg-white/55 py-10 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col lg:flex-row flex-wrap items-start lg:items-center justify-between gap-6 lg:gap-7">
            <div className="flex items-center gap-3 text-sm text-[#075E54]/70 max-w-md">
              <Shield className="h-6 w-6 text-[#25D366] shrink-0" />
              <span>
                Built on the <b className="text-[#075E54]">official Meta WhatsApp Business API</b> — no
                grey-market tools, no ban risk.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:flex sm:flex-wrap sm:gap-8 md:gap-11 w-full lg:w-auto">
              {[
                { value: "1M+", label: "messages / mo" },
                { value: "90%", label: "avg delivery" },
                { value: "40%", label: "avg read rate" },
                { value: "High", label: "quality rating" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-heading font-semibold text-[#25D366]">{s.value}</p>
                  <p className="text-[11px] uppercase tracking-wide text-[#075E54]/45">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Why teams trust us */}
      <AnimatedSection id="trust" variant="shield" intensity="bold" dark className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <div className="max-w-2xl mb-14">
              <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Trust & compliance
              </p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 text-white">
                Built so you can send with confidence
              </h2>
              <p className="text-lg text-white/65">
                WhatsApp is where your buyers live — but only if your stack is official, transparent, and
                accountable. Here&apos;s how ChatBoatAI earns that trust.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-5">
            {trustPillars.map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-[#25D366]/40 transition-colors">
                  <div className="h-11 w-11 rounded-xl bg-[#25D366]/20 flex items-center justify-center mb-4">
                    <p.icon className="h-5 w-5 text-[#25D366]" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.15}>
            <div className="mt-12">
              <TrustBadgeBanner variant="dark" />
            </div>
          </FadeIn>
        </div>
      </AnimatedSection>

      {/* Delivery wave band */}
      <AnimatedSection variant="wave" intensity="bold" dark className="py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <FaWhatsapp className="h-10 w-10 text-[#25D366] mx-auto mb-3" />
          <p className="font-heading text-white text-xl md:text-2xl font-bold">
            Millions of messages. One dashboard.
          </p>
          <p className="text-white/70 text-sm mt-2">
            Watch delivery pulse across your audience in real time.
          </p>
        </div>
      </AnimatedSection>

      {/* Features */}
      <AnimatedSection id="features" variant="particles" intensity="subtle" className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <div className="max-w-2xl mb-14">
              <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3 flex items-center gap-2">
                <FaWhatsapp className="h-4 w-4" /> Platform
              </p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 text-[#075E54]">
                Everything WhatsApp marketing needs, in one place
              </h2>
              <p className="text-lg text-[#075E54]/55">
                ChatBoatAI replaces the mess of spreadsheets, broadcast lists and manual follow-ups with a
                single, compliant command centre.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={(i % 3) * 0.1}>
                <div className="h-full p-6 rounded-xl border border-[#075E54]/10 bg-white/80 hover:border-[#25D366]/50 hover:bg-white transition-all duration-300 shadow-sm">
                  <div className="h-11 w-11 rounded-lg bg-[#25D366]/12 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-[#128C7E]" />
                  </div>
                  <h3 className="font-semibold text-[#075E54] mb-1.5">{f.title}</h3>
                  <p className="text-[#075E54]/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Bubbles band */}
      <AnimatedSection variant="bubbles" intensity="bold" className="py-16 md:py-20 px-4 bg-[#ECE5DD]/60">
        <div className="container mx-auto max-w-md text-center">
          <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#25D366]/25 px-6 py-5 shadow-xl">
            <div className="flex justify-center gap-2 mb-3">
              <FaWhatsapp className="h-6 w-6 text-[#25D366]" />
              <FaWhatsapp className="h-6 w-6 text-[#128C7E] opacity-70" />
              <FaWhatsapp className="h-6 w-6 text-[#075E54] opacity-50" />
            </div>
            <p className="font-heading font-bold text-[#075E54] text-lg">Conversations that convert</p>
            <p className="text-sm text-[#075E54]/60 mt-1">
              Every broadcast can become a sales chat — replied to from your shared inbox.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* How it works */}
      <AnimatedSection id="how-it-works" variant="orbit" intensity="subtle" className="py-16 md:py-24 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-5xl">
          <FadeIn>
            <div className="max-w-2xl mb-14">
              <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3">Setup</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 text-[#075E54]">Live in three steps, not three weeks</h2>
              <p className="text-lg text-[#075E54]/55">
                If you have a Facebook Business account and a phone number, you can be sending your first
                campaign today.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className="h-full p-6 rounded-xl border border-[#075E54]/10 bg-white/80 hover:border-[#25D366]/40 transition-colors">
                  <div className="text-3xl font-semibold bg-gradient-to-br from-[#128C7E] to-[#25D366] bg-clip-text text-transparent font-mono mb-4">{step.n}</div>
                  <h3 className="font-semibold text-lg mb-1.5 text-[#075E54]">{step.title}</h3>
                  <p className="text-[#075E54]/55 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Use cases */}
      <AnimatedSection id="use-cases" variant="messages" intensity="subtle" className="py-16 md:py-24 px-4 border-t border-[#075E54]/10 bg-white/40">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <div className="max-w-2xl mb-14">
              <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3">Who it&apos;s for</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 text-[#075E54]">Built for teams that sell in conversations</h2>
              <p className="text-lg text-[#075E54]/55">
                WhatsApp is where Indian buyers actually respond. ChatBoatAI turns those conversations into a
                pipeline.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {useCases.map((c, i) => (
              <FadeIn key={c.title} delay={i * 0.1}>
                <div className="h-full p-6 rounded-xl border border-[#075E54]/10 bg-gradient-to-b from-white to-[#F7FBF8]">
                  <span className="inline-block text-xs font-medium uppercase tracking-wide text-[#128C7E] bg-[#25D366]/12 border border-[#25D366]/25 rounded-full px-3 py-1 mb-4">
                    {c.tag}
                  </span>
                  <h3 className="font-semibold text-lg mb-1.5 text-[#075E54]">{c.title}</h3>
                  <p className="text-[#075E54]/55 text-sm leading-relaxed mb-4">{c.desc}</p>
                  <ul className="space-y-2">
                    {c.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-[#075E54]/65">
                        <Check className="h-4 w-4 text-[#25D366] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* NEW: Social proof */}
      <AnimatedSection id="proof" variant="helix" intensity="bold" dark className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3 flex items-center justify-center gap-2">
                <Star className="h-4 w-4" /> Customer proof
              </p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                Teams that switched — and stayed
              </h2>
              <p className="text-white/65">
                Real operators using WhatsApp the compliant way: broadcasts, inbox, and delivery proof in one place.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="flex gap-1 mb-4">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-[#25D366] text-[#25D366]" />
                    ))}
                  </div>
                  <p className="text-white/85 text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-white/50 text-xs mt-0.5">{t.role}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* NEW: Guarantees */}
      <AnimatedSection variant="rings" intensity="subtle" className="py-16 md:py-24 px-4 border-y border-[#075E54]/10">
        <div className="container mx-auto max-w-5xl">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3">Our promise</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#075E54] mb-4">
                Clear commitments before you subscribe
              </h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {guarantees.map((g, i) => (
              <FadeIn key={g.title} delay={i * 0.1}>
                <div className="text-center p-6 rounded-2xl border border-[#075E54]/10 bg-white/80">
                  <div className="mx-auto h-12 w-12 rounded-full bg-[#25D366]/12 flex items-center justify-center mb-4">
                    <g.icon className="h-6 w-6 text-[#128C7E]" />
                  </div>
                  <h3 className="font-heading font-semibold text-[#075E54] mb-2">{g.title}</h3>
                  <p className="text-sm text-[#075E54]/55 leading-relaxed">{g.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Signal / Meta reliability */}
      <AnimatedSection variant="broadcast" intensity="bold" dark className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-lg text-center">
          <FaWhatsapp className="h-12 w-12 text-[#25D366] mx-auto mb-4" />
          <p className="font-heading text-2xl md:text-3xl font-bold text-white">
            Official API. Enterprise reliability.
          </p>
          <p className="text-white/65 text-sm mt-3">
            Quality rating, messaging limits, and template status — synced live from Meta.
          </p>
        </div>
      </AnimatedSection>

      {/* Pricing */}
      <AnimatedSection id="pricing" variant="ticks" intensity="subtle" className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 text-[#075E54]">
                Simple plans that scale with your messaging
              </h2>
              <p className="text-lg text-[#075E54]/55">
                Every plan runs on the official API. Meta&apos;s per-conversation charges are billed at cost —
                we never mark them up.
              </p>
            </div>
          </FadeIn>
          <div className={`grid gap-6 items-stretch ${plans.length >= 3 ? "md:grid-cols-3" : plans.length === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" : "max-w-md mx-auto"}`}>
            {plansLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)
            ) : (
            plans.map((plan, i) => (
              <FadeIn key={plan.id || plan.name} delay={i * 0.1}>
                <div
                  className={`h-full flex flex-col rounded-2xl p-8 relative ${
                    plan.featured
                      ? "border-2 border-[#25D366] bg-white shadow-2xl shadow-[#25D366]/15"
                      : "border border-[#075E54]/10 bg-white/80"
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#25D366] text-white text-xs font-semibold uppercase tracking-wide px-4 py-1 flex items-center gap-1">
                      <FaWhatsapp className="h-3 w-3" /> Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-heading font-semibold text-[#075E54]">{plan.name}</h3>
                  <p className="text-[#075E54]/45 text-sm mt-1">{plan.tagline}</p>
                  <div className="mt-6 mb-1">
                    <span className="text-4xl font-bold text-[#075E54]">{plan.price}</span>
                    <span className="text-[#075E54]/45">/month</span>
                  </div>
                  <p className="text-xs text-[#075E54]/40 font-mono mb-6">+ Meta conversation charges, + GST</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-[#25D366] flex-shrink-0" />
                        <span className="text-[#075E54]/75 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={"/login"} className="block">
                    <Button
                      className={`w-full font-semibold gap-2 ${
                        plan.featured
                          ? "bg-[#25D366] text-white hover:bg-[#20bd5a]"
                          : "border border-[#075E54]/15 bg-transparent text-[#075E54] hover:bg-[#25D366]/10"
                      }`}
                      size="lg"
                      variant={plan.featured ? "default" : "outline"}
                      data-testid={`button-subscribe-${plan.name.toLowerCase()}`}
                    >
                      {plan.featured && <FaWhatsapp className="h-4 w-4" />}
                      {plan.cta}
                    </Button>
                  </a>
                </div>
              </FadeIn>
            ))
            )}
          </div>
          <p className="text-center text-sm text-[#075E54]/40 font-mono mt-8">
            All prices exclusive of GST · Free trial on every plan · No setup fees
          </p>
        </div>
      </AnimatedSection>

      {/* NEW: Support trust */}
      <AnimatedSection variant="typing" intensity="subtle" className="py-16 md:py-20 px-4 border-t border-[#075E54]/10 bg-white/50">
        <div className="container mx-auto max-w-4xl">
          <FadeIn>
            <div className="rounded-3xl border border-[#25D366]/25 bg-white/90 p-5 sm:p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 shadow-lg shadow-[#25D366]/10">
              <div className="h-16 w-16 rounded-2xl bg-[#25D366] flex items-center justify-center shrink-0 shadow-lg shadow-[#25D366]/30">
                <Headphones className="h-8 w-8 text-white" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h3 className="font-heading text-2xl font-bold text-[#075E54] mb-2">
                  Stuck on setup? Talk to a human.
                </h3>
                <p className="text-[#075E54]/60 text-sm leading-relaxed">
                  Meta embeds, template rejections, number migration — we help you get live. Call{" "}
                  <a href={`tel:+91${HELP_NUMBER}`} className="font-semibold text-[#128C7E] underline">
                    +91 {HELP_NUMBER}
                  </a>{" "}
                  or reach us on WhatsApp during business hours.
                </p>
              </div>
              <a href={`tel:+91${HELP_NUMBER}`} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#075E54] hover:bg-[#0a6b5f] text-white gap-2 shrink-0">
                  <Phone className="h-4 w-4" /> Call support
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </AnimatedSection>

      {/* FAQ */}
      <AnimatedSection id="faq" variant="inbox" intensity="subtle" className="py-16 md:py-24 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl">
          <FadeIn>
            <div className="text-center mb-12">
              <p className="text-[#25D366] text-sm font-medium tracking-wide uppercase mb-3">FAQ</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#075E54]">Questions, answered</h2>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="border border-[#075E54]/10 rounded-xl bg-white/80 px-4 sm:px-6 mb-3 last:mb-0"
                >
                  <AccordionTrigger className="text-left font-heading font-semibold text-[#075E54] hover:no-underline py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#075E54]/55 text-sm leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </AnimatedSection>

      {/* Final CTA */}
      <AnimatedSection variant="spark" intensity="bold" className="py-16 md:py-24 px-4 border-t border-[#075E54]/10">
        <div className="container mx-auto max-w-3xl text-center">
          <FadeIn>
            <div className="rounded-3xl border border-[#25D366]/40 bg-[#075E54] px-4 sm:px-6 md:px-16 py-12 md:py-16 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_100%,rgba(37,211,102,0.35),transparent)]" />
              <div className="relative">
                <FaWhatsapp className="h-12 w-12 text-[#25D366] mx-auto mb-5" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold mb-4">
                  Your customers are already on WhatsApp.
                  <br className="hidden sm:block" />
                  <span className="sm:hidden"> </span>
                  Meet them there.
                </h2>
                <p className="text-lg text-white/70 mb-8 max-w-lg mx-auto">
                  Set up in a day, send your first campaign this week, and watch the read rates speak for
                  themselves.
                </p>
                <a href={"/login"} className="inline-block w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/30">
                    <FaWhatsapp className="h-5 w-5" /> Start Your Free Trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <p className="mt-6 text-sm text-white/50">
                  <a href="#trust" className="underline underline-offset-2 hover:text-white/70">
                    See why teams trust ChatBoatAI
                  </a>
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="soft" intensity="subtle" className="border-t border-[#075E54]/10 py-10 sm:py-12 px-4 bg-white/70">
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
                    <Link href={href} title={`${label} — ChatBoatAI`} className="hover:text-[#075E54]">{label}</Link>
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
                <li><Link href="/contact" title="Contact ChatBoatAI support" className="hover:text-[#075E54]">Contact Us</Link></li>
                <li>
                  <a href={`tel:+91${HELP_NUMBER}`} title="Call ChatBoatAI support" className="hover:text-[#075E54] flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[#25D366]" /> +91 {HELP_NUMBER}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#075E54]/10 mt-8 pt-8 flex flex-col gap-4">
            <SocialShare title="WhatsApp Business API Platform for Teams | ChatBoatAI" />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-[#075E54]/40 text-center sm:text-left">
              <p>&copy; {new Date().getFullYear()} ChatBoatAI. All rights reserved.</p>
              <p className="flex items-center justify-center gap-1.5 max-w-md sm:max-w-none flex-wrap">
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
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>
      </div>
    </div>
  );
}
