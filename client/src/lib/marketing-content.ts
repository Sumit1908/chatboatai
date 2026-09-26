import {
  BarChart3,
  CalendarClock,
  Contact,
  FileText,
  Handshake,
  Headphones,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Lock,
  Plug,
  Send,
  Server,
  Shield,
  Clock,
  UserPlus,
  Workflow,
  BadgeCheck,
  Eye,
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

/**
 * "live" = works in the logged-in app today; "soon" = planned, not built.
 * EVERY public page reads availability from here - change a status only
 * when the feature actually ships, so the site never over-promises.
 */
export type ModuleStatus = "live" | "soon";

export type CrmModule = {
  id: string;
  name: string;
  icon: LucideIcon;
  status: ModuleStatus;
  summary: string;
  points: string[];
};

/** The CRM, in the order the product is organised (matches the app sidebar). */
export const CRM_MODULES: CrmModule[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: LayoutDashboard,
    status: "live",
    summary: "Your business at a glance, calculated from your own data.",
    points: ["Total leads, active deals, deals won and revenue this month", "Pipeline by stage", "Upcoming follow-ups and recent leads"],
  },
  {
    id: "leads",
    name: "Leads",
    icon: UserPlus,
    status: "live",
    summary: "Every enquiry in one list, with source, status and value.",
    points: ["Add leads with phone, email, company and source", "Search and filter by status", "Convert a qualified lead into a deal in one click"],
  },
  {
    id: "contacts",
    name: "Contacts",
    icon: Contact,
    status: "live",
    summary: "Your customer list with lists, tags and CSV import. Currently requires a connected WhatsApp number.",
    points: ["Import contacts from CSV", "Organise with lists and tags", "Message contacts through the WhatsApp integration", "Contacts without WhatsApp: coming soon"],
  },
  {
    id: "deals",
    name: "Deals",
    icon: Handshake,
    status: "live",
    summary: "Track opportunities with value, stage and expected close date.",
    points: ["Deal value in rupees", "Expected close date and notes", "Linked to the lead it came from"],
  },
  {
    id: "pipeline",
    name: "Sales Pipeline",
    icon: KanbanSquare,
    status: "live",
    summary: "A visual board from New to Closed Won.",
    points: ["Drag deals between stages", "Stage totals by count and value", "Won and lost deals recorded with their close date"],
  },
  {
    id: "follow-ups",
    name: "Follow-ups",
    icon: CalendarClock,
    status: "live",
    summary: "Calls, meetings and messages scheduled against each lead or deal.",
    points: ["Overdue, today and upcoming views", "Linked to leads and deals", "Mark done in one click"],
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: ListChecks,
    status: "live",
    summary: "Internal to-dos alongside your customer follow-ups.",
    points: ["Due dates and notes", "Open and completed lists", "Link a task to a lead or deal"],
  },
  {
    id: "automation",
    name: "Automation",
    icon: Workflow,
    status: "soon",
    summary: "Rules that assign leads, send first replies and create follow-ups for you.",
    points: ["Auto-assign new leads", "Follow-up tasks on stage changes", "WhatsApp welcome messages for new leads"],
  },
  {
    id: "reports",
    name: "Reports",
    icon: BarChart3,
    status: "soon",
    summary: "Deeper reporting on sources, conversion and revenue.",
    points: ["Conversion by lead source", "Win rate by stage", "Revenue by month, with CSV export"],
  },
  {
    id: "integrations",
    name: "Integrations",
    icon: Plug,
    status: "live",
    summary: "Channels and tools connected to the CRM — WhatsApp today, more on the way.",
    points: ["WhatsApp Business (live)", "Gmail, Facebook Leads, Google, Calendar and more (coming soon)"],
  },
];

/** AI is an intelligence layer across the CRM. None of it is built yet. */
export const AI_CAPABILITIES: { title: string; desc: string }[] = [
  { title: "Lead summaries", desc: "A short summary of each lead's history before you call." },
  { title: "Next best action", desc: "Suggestions for which leads and deals need attention today." },
  { title: "Reply drafts", desc: "Draft WhatsApp and email replies from the conversation context." },
  { title: "Lead scoring", desc: "Rank leads by how likely they are to convert." },
];

/** What the WhatsApp integration does today (all live - verified in the code). */
export const WHATSAPP_CAPABILITIES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Plug,
    title: "Connect your number",
    desc: "Connect a WhatsApp Business number through Meta's official platform — embedded signup or your access token.",
  },
  {
    icon: Inbox,
    title: "Shared inbox with replies",
    desc: "Customer messages land in one inbox. Reply from ChatBoatAI, and give teammates access to the same number.",
  },
  {
    icon: FileText,
    title: "Message templates",
    desc: "Create templates with media, variables and buttons, submit them to Meta and track approval.",
  },
  {
    icon: Send,
    title: "Campaigns — now or scheduled",
    desc: "Send approved-template campaigns to your contact lists immediately or at a scheduled time.",
  },
  {
    icon: Eye,
    title: "Delivery analytics",
    desc: "Sent, delivered, read and failed — tracked per message and per campaign.",
  },
  {
    icon: Contact,
    title: "Contacts, lists and tags",
    desc: "Import contacts from CSV and organise them into lists and tags for targeting.",
  },
];

export const steps = [
  {
    n: "01",
    title: "Set up your CRM",
    desc: "Sign up, add your first leads and create deals for the opportunities you're already working. With WhatsApp connected, you can also import contacts from a CSV.",
  },
  {
    n: "02",
    title: "Work your pipeline",
    desc: "Move deals from New to Closed Won, schedule follow-ups against each lead, and keep tasks in one list.",
  },
  {
    n: "03",
    title: "Connect your channels",
    desc: "Connect WhatsApp to message customers from the same workspace. More integrations are rolling out.",
  },
];

export const setupTree = {
  label: "Get started on ChatBoatAI",
  children: [
    {
      label: "Your CRM",
      children: [{ label: "Create your account" }, { label: "Add or import leads" }, { label: "Create your first deals" }],
    },
    {
      label: "Daily workflow",
      children: [{ label: "Schedule follow-ups" }, { label: "Move deals through the pipeline" }, { label: "Check the dashboard" }],
    },
    {
      label: "WhatsApp integration",
      children: [{ label: "Meta Business Manager" }, { label: "Connect your number" }, { label: "Get templates approved" }],
    },
    {
      label: "First campaign",
      children: [{ label: "Import contacts" }, { label: "Pick approved template" }, { label: "Send & track delivery" }],
    },
  ],
};

export const setupChecklist = [
  {
    phase: "Step 1 — Your CRM",
    items: [
      "Create your ChatBoatAI account and choose a plan",
      "Add the leads you're working on (contact CSV import is available once WhatsApp is connected)",
      "Create deals and place them in the right pipeline stage",
    ],
  },
  {
    phase: "Step 2 — Daily workflow",
    items: [
      "Schedule follow-ups against leads and deals",
      "Review Overdue and Today on the Follow-ups page each morning",
      "Mark deals Closed Won so revenue shows on your dashboard",
    ],
  },
  {
    phase: "Step 3 — Connect WhatsApp (optional)",
    items: [
      "Have a Facebook Business Manager account with admin access",
      "Use a phone number not active on the WhatsApp app",
      "Connect through Settings → WhatsApp using embedded signup or your access token",
    ],
  },
  {
    phase: "Step 4 — WhatsApp campaigns",
    items: [
      "Create a template with clear opt-out language and submit it to Meta",
      "Import or sync your opted-in contacts",
      "Send a test batch, then launch the full campaign",
    ],
  },
];

export const useCases = [
  {
    tag: "Real estate",
    title: "Developers & brokers",
    desc: "Track every enquiry from first call to booking.",
    items: ["Leads from portals, ads, walk-ins and WhatsApp in one list", "Site-visit follow-ups scheduled per lead", "Pipeline by stage with deal values"],
  },
  {
    tag: "Education",
    title: "Institutes & coaching",
    desc: "Turn enquiries into enrolments.",
    items: ["Enquiry list with source and status", "Counselling calls as follow-ups", "Admissions tracked as deals"],
  },
  {
    tag: "D2C & retail",
    title: "Stores & e-commerce",
    desc: "Keep customers and conversations connected.",
    items: ["Customer list with tags and CSV import", "Offer campaigns and order updates on WhatsApp", "Shared inbox for support replies"],
  },
  {
    tag: "Agencies",
    title: "Agencies & services",
    desc: "Run your own sales and client work from one place.",
    items: ["New-business pipeline with deal values", "Follow-ups and tasks in one list", "Client WhatsApp campaigns with delivery reports"],
  },
];

export const faqs = [
  {
    category: "general" as const,
    q: "What is ChatBoatAI?",
    a: "ChatBoatAI is a CRM for growing businesses: leads, contacts, deals, a sales pipeline, follow-ups and tasks in one dashboard, with WhatsApp built in as an integration. AI and more integrations are on our roadmap.",
  },
  {
    category: "general" as const,
    q: "What's available today, and what's coming soon?",
    a: "Available now: dashboard, leads, contacts, deals, sales pipeline, follow-ups, tasks and the WhatsApp integration. Coming soon: automation, detailed reports, AI features and integrations such as Gmail, Facebook Leads, Google, Google Calendar, Slack, Zapier and HubSpot. Anything not yet available is labelled “Coming soon” on this site and in the app.",
  },
  {
    category: "general" as const,
    q: "Do I need WhatsApp to use the CRM?",
    a: "Leads, deals, the sales pipeline, follow-ups, tasks and the dashboard work without WhatsApp. The Contacts list currently requires a connected WhatsApp number; contacts without WhatsApp are coming soon.",
  },
  {
    category: "whatsapp" as const,
    q: "Is the WhatsApp integration official?",
    a: "Yes. It runs on Meta's official WhatsApp Business Platform with a verified business profile — no unofficial tools. Meta's own messaging policies and quality ratings still apply to every number.",
  },
  {
    category: "whatsapp" as const,
    q: "Do I need a new phone number for WhatsApp?",
    a: "You can use a fresh number or migrate an existing WhatsApp Business number. A number connected to the API can't be used in the regular WhatsApp app at the same time, so most teams dedicate a number to it.",
  },
  {
    category: "whatsapp" as const,
    q: "What are Meta conversation charges?",
    a: "Meta charges a small per-conversation fee for WhatsApp messages sent through the API, by category (marketing, utility, authentication). They're billed at Meta's rates with no markup — your plan covers the platform.",
  },
  {
    category: "whatsapp" as const,
    q: "How fast do WhatsApp templates get approved?",
    a: "Meta reviews templates itself — often within minutes, though it can take longer. ChatBoatAI shows the live approval status of every template.",
  },
  {
    category: "general" as const,
    q: "Can my team use it?",
    a: "Teammates can be invited to share your WhatsApp numbers and inbox today. Shared CRM workspaces (leads, deals and follow-ups visible to the whole team) are coming soon; right now CRM records are private to the account that created them.",
  },
  {
    category: "billing" as const,
    q: "How do I get started?",
    a: "Create an account, choose a plan and pay securely with Razorpay. Your plan activates as soon as the payment is verified, and you can start adding leads and connecting WhatsApp right away.",
  },
];

export const trustPillars: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Lock,
    title: "Your data stays yours",
    desc: "Leads, deals, contacts and conversations belong to your workspace. We don't sell data or resell your leads.",
  },
  {
    icon: Shield,
    title: "Workspace isolation",
    desc: "Every CRM record is tied to the account that owns it, and every request is checked against that owner.",
  },
  {
    icon: BadgeCheck,
    title: "Official WhatsApp integration",
    desc: "WhatsApp messages go through Meta's Cloud API with a verified business profile — no grey-market gateways.",
  },
  {
    icon: Server,
    title: "Built for reliability",
    desc: "WhatsApp messages go through Meta's official Cloud API, and payments are processed by Razorpay.",
  },
];

/**
 * OWNER REVIEW: set to true only after confirming these are real customers
 * who agreed to be quoted. While false, no testimonial is shown anywhere.
 */
export const TESTIMONIALS_VERIFIED = false;

/**
 * Existing customer quotes, kept word for word. They describe the WhatsApp
 * side of the product; don't rewrite them into CRM claims.
 */
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
    icon: Eye,
    title: "No over-promising",
    desc: "Features that aren't built yet are labelled “Coming soon” — on this site and inside the app.",
  },
  {
    icon: Clock,
    title: "Clear monthly pricing",
    desc: "Prices are shown up front. You pay securely through Razorpay, and your plan activates as soon as the payment is verified.",
  },
  {
    icon: Headphones,
    title: "Humans when you need them",
    desc: "Phone and email support for setup, WhatsApp templates and billing questions.",
  },
];

/** Kept for any legacy imports; the Features page now uses CRM_MODULES. */
export const features = CRM_MODULES.filter((m) => m.status === "live").map((m) => ({
  icon: m.icon,
  title: m.name,
  desc: m.summary,
}));


/**
 * Top navigation for the CRM-first site. `/#…` entries are sections on the
 * home page (plain anchors, so they work from any page).
 */
export const PRIMARY_NAV = [
  { href: "/crm", label: "CRM" },
  { href: "/#ai", label: "AI Tools" },
  { href: "/#whatsapp", label: "WhatsApp" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/integrations", label: "Integrations" },
] as const;

export const RESOURCES_NAV = [
  { href: "/how-it-works", label: "How It Works", desc: "From first lead to closed deal" },
  { href: "/setup-guide", label: "Setup Guide", desc: "Connect your channels step by step" },
  { href: "/faq", label: "FAQ", desc: "Answers to common questions" },
  { href: "/trust", label: "Trust & Security", desc: "How we protect your data" },
  { href: "/proof", label: "Our Commitments", desc: "What you can expect from us" },
] as const;

