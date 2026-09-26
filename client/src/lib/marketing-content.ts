import {
  Briefcase,
  Building2,
  CalendarClock,
  Contact,
  Headphones,
  KanbanSquare,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Plug,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Copy for the public website. Every feature listed as available here must
 * work in the app today (checked against the code) - anything planned goes in
 * COMING_SOON or is labelled "Coming Soon", never in the feature list. No
 * unverified statistics and no invented testimonials.
 */

/** Top navigation. `/#…` entries are sections of the home page. */
export const PRIMARY_NAV = [
  { href: "/#product", label: "Product" },
  { href: "/#integrations", label: "Integrations" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

/** Hero illustration: what a ChatBoatAI CRM setup covers. */
export const SETUP_ITEMS: { title: string; detail: string; status: "included" | "service" | "soon" }[] = [
  { title: "Leads, deals & pipeline", detail: "Track every enquiry from New to Closed Won", status: "included" },
  { title: "Tasks & follow-ups", detail: "Overdue, today and upcoming in one view", status: "included" },
  { title: "Team access", detail: "Invite teammates up to your plan's user limit", status: "included" },
  { title: "WhatsApp Business", detail: "Inbox and campaigns via Meta's official platform", status: "included" },
  { title: "CRM configuration", detail: "Set up around your workflow by our team", status: "service" },
  { title: "Meta Lead Ads", detail: "Facebook & Instagram lead capture", status: "soon" },
];

export type Feature = {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  /** Delivered by the ChatBoatAI team, not a software feature. */
  service?: boolean;
};

/** "Why ChatBoatAI CRM" - all available in the app today, or a team service. */
export const WHY_FEATURES: Feature[] = [
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
    desc: "Our team configures the CRM, users, pipeline and supported integrations around your workflow.",
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

/** "How it works" - the custom CRM setup service. */
export const SETUP_STEPS = [
  {
    title: "Tell Us Your Workflow",
    desc: "We understand how your business currently manages leads, customers and sales.",
  },
  {
    title: "Configure Your CRM",
    desc: "We configure the CRM, users, pipeline and supported integrations around your requirements.",
  },
  {
    title: "Connect Your Channels",
    desc: "Connect WhatsApp Business through Meta's official platform, and discuss any custom integration you need.",
  },
  {
    title: "Run & Manage",
    desc: "Your team uses the CRM while ChatBoatAI helps you manage configuration changes and integrations.",
  },
];

/** "Who It's For". */
export const AUDIENCES: Feature[] = [
  {
    id: "real-estate",
    icon: Building2,
    title: "Real Estate Companies",
    desc: "Track property enquiries, site-visit follow-ups and deals through your sales pipeline.",
  },
  {
    id: "agencies",
    icon: Megaphone,
    title: "Marketing Agencies",
    desc: "Keep every campaign enquiry in one CRM and make sure each lead gets a follow-up.",
  },
  {
    id: "sales",
    icon: TrendingUp,
    title: "Sales Organizations",
    desc: "Track pipelines, deal values and conversions from one dashboard.",
  },
  {
    id: "growing",
    icon: Briefcase,
    title: "Growing Businesses",
    desc: "Get a CRM set up around your workflow without the technical complexity.",
  },
];

/** Custom integration work offered as a service (used on the integrations grid). */
export const CUSTOM_INTEGRATION = {
  icon: Plug,
  title: "CRM Integration Support",
  desc: "Custom integrations available based on your business requirements. Tell us which tools your team uses and we'll discuss how to connect them.",
};
