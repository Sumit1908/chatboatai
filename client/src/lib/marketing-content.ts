import {
  Users,
  BarChart3,
  Shield,
  Inbox,
  Send,
  FileText,
  RefreshCw,
  Lock,
  BadgeCheck,
  Headphones,
  Eye,
  Server,
  Clock,
  type LucideIcon,
} from "lucide-react";

export const HELP_NUMBER = "9336791807";
export const HELP_NUMBER_DISPLAY = "+91 9336791807";
export const EMAIL_INFO = "thecleverwork@gmail.com";
export const EMAIL_SUPPORT = "thecleverwork@gmail.com";
export const EMAIL_BILLING = "thecleverwork@gmail.com";

export const WA = {
  green: "#25D366",
  teal: "#128C7E",
  dark: "#075E54",
  light: "#DCF8C6",
  chat: "#ECE5DD",
  mist: "#F7FBF8",
} as const;

export const features = [
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

export const steps = [
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

export const setupTree = {
  label: "Go live on ChatBoatAI",
  children: [
    {
      label: "Meta Business",
      children: [
        { label: "Facebook Business Manager" },
        { label: "Verify business details" },
      ],
    },
    {
      label: "WhatsApp API",
      children: [
        { label: "Add phone number" },
        { label: "Embedded signup" },
        { label: "Connect WABA token" },
      ],
    },
    {
      label: "Templates",
      children: [
        { label: "Create message template" },
        { label: "Submit to Meta" },
        { label: "Wait for approval" },
      ],
    },
    {
      label: "First campaign",
      children: [
        { label: "Import contacts" },
        { label: "Pick approved template" },
        { label: "Send & track delivery" },
      ],
    },
  ],
};

export const setupChecklist = [
  {
    phase: "Before you start",
    items: [
      "Facebook Business Manager account with admin access",
      "A phone number not active on WhatsApp personal or Business app",
      "Business website or Facebook Page for verification",
    ],
  },
  {
    phase: "Day 1 — Connect",
    items: [
      "Sign up on ChatBoatAI and open Settings → WhatsApp API",
      "Complete Meta embedded signup flow",
      "Paste your permanent access token and WABA ID",
    ],
  },
  {
    phase: "Day 1–2 — Templates",
    items: [
      "Create your first marketing template with clear opt-out language",
      "Submit for Meta review (usually minutes to hours)",
      "Fix any rejection reasons with our support team",
    ],
  },
  {
    phase: "Day 2–3 — Launch",
    items: [
      "Import or sync your opted-in contact list",
      "Create a campaign, select segment and template",
      "Send a test batch, then launch full broadcast",
    ],
  },
];

export const useCases = [
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

export const faqs = [
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

export const trustPillars: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: BadgeCheck,
    title: "Official Meta WhatsApp API",
    desc: "No grey-market gateways. Your messages go through Meta's Cloud API with a verified business profile.",
  },
  {
    icon: Lock,
    title: "Your data stays yours",
    desc: "Contacts and conversations belong to your workspace. We don't sell audience data or resell your leads.",
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

export const testimonials = [
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

export const guarantees: { icon: LucideIcon; title: string; desc: string }[] = [
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

export const MARKETING_NAV = [
  { href: "/features", label: "Features" },
  { href: "/trust", label: "Trust" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/setup-guide", label: "Setup Guide" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/proof", label: "Proof" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
] as const;
