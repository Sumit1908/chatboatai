import {
  CalendarClock,
  Contact,
  Headphones,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Copy for the public website. Every feature listed as available here must
 * work in the app today (checked against the code) - anything planned goes in
 * COMING_SOON, never in the feature list.
 */

/** Top navigation. `/#…` entries are sections of the home page. */
export const PRIMARY_NAV = [
  { href: "/#product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

export type HomeFeature = {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  /** Delivered by the ChatBoatAI team, not a software feature. */
  service?: boolean;
};

/** "Everything You Need to Run Your CRM" - all available in the app today. */
export const HOME_FEATURES: HomeFeature[] = [
  {
    id: "leads",
    icon: UserPlus,
    title: "Lead Management",
    desc: "Capture, organise and track every lead from first contact to conversion, with source, status and value.",
  },
  {
    id: "pipeline",
    icon: KanbanSquare,
    title: "Sales Pipeline & Deals",
    desc: "Move deals through clear stages from New to Closed Won and see the value in every stage.",
  },
  {
    id: "follow-ups",
    icon: CalendarClock,
    title: "Tasks & Follow-ups",
    desc: "Schedule calls, meetings and to-dos against leads and deals, with overdue, today and upcoming views.",
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "CRM Dashboard",
    desc: "Leads, open deals, deals won and revenue - calculated from your own data, in one view.",
  },
  {
    id: "contacts",
    icon: Contact,
    title: "Contacts, Lists & Tags",
    desc: "Import customer contacts from CSV and organise them into lists and tags (with WhatsApp connected).",
  },
  {
    id: "whatsapp",
    icon: MessageSquare,
    title: "WhatsApp Inbox & Campaigns",
    desc: "Reply to customers from a shared inbox and send approved-template campaigns, with delivery analytics.",
  },
  {
    id: "team",
    icon: Users,
    title: "Team Access",
    desc: "Invite teammates up to your plan's user limit to share your WhatsApp numbers and inbox.",
  },
  {
    id: "setup",
    icon: Headphones,
    title: "Custom CRM Setup",
    desc: "Need the CRM set up around your workflow? Our team can configure it and help with integrations.",
    service: true,
  },
];

/** Planned, not built - shown as "Coming soon" only. */
export const COMING_SOON = [
  "Shared team CRM (lead assignment & permissions)",
  "Reports",
  "Workflow automation",
  "CRM lead import",
];

/**
 * Home page FAQ (also used for the FAQPage structured data). Answers describe
 * the product as it works today - no promises beyond it.
 */
export const faqs = [
  {
    q: "What is ChatBoatAI?",
    a: "ChatBoatAI is a CRM platform for managing leads, deals, your sales pipeline, tasks and follow-ups - with WhatsApp built in for customer conversations and campaigns.",
  },
  {
    q: "Can you set up a CRM for our business?",
    a: "Yes. Our team can configure ChatBoatAI around your workflow - how you track leads, your pipeline stages, your users and the supported integrations. Send us your requirements through the Contact page.",
  },
  {
    q: "Can we integrate our existing tools?",
    a: "WhatsApp Business (through Meta's official platform) is available today. For other tools, tell us what you need on the Contact page and our team will discuss a custom integration with you.",
  },
  {
    q: "How many users can we have?",
    a: "Each plan shows its user limit on the Pricing page. Every current plan includes up to 10 users, including you.",
  },
  {
    q: "Can my team use the CRM?",
    a: "Yes, up to your plan's user limit. Teammates share your WhatsApp numbers and inbox today. Leads, deals and tasks are currently kept per user - a shared team CRM with lead assignment and permissions is coming soon.",
  },
  {
    q: "Can I manage leads and customers?",
    a: "Yes. Add leads with their contact details, source, status and value, turn them into deals, move deals through your pipeline and schedule follow-ups.",
  },
  {
    q: "How do I get started?",
    a: "Create an account, choose a plan and pay securely with Razorpay. Your plan activates as soon as the payment is verified. For a custom setup, contact our team.",
  },
];
