import { faqs, EMAIL_INFO, EMAIL_SUPPORT, HELP_NUMBER } from "./marketing-content";

/** Canonical production origin — must match the live app host. */
export const SITE_URL = "https://chatboatai.in";
export const SITE_NAME = "ChatBoatAI";
export const SITE_AUTHOR = "ChatBoatAI";
export const SITE_PUBLISHER = "ChatBoatAI";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const DEFAULT_KEYWORDS =
  "CRM, lead management, sales pipeline, follow-ups, WhatsApp CRM, WhatsApp Business API, business integrations, ChatBoatAI";

export type SeoRobots = "index, follow" | "noindex, nofollow" | "noindex, follow";

export type SeoPageConfig = {
  path: string;
  title: string;
  description: string;
  keywords?: string;
  robots?: SeoRobots;
  ogType?: "website" | "article";
  /** Extra JSON-LD objects beyond Organization (merged into script array). */
  jsonLd?: Record<string, unknown>[];
};

function absoluteUrl(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    email: EMAIL_INFO,
    telephone: `+91-${HELP_NUMBER}`,
    sameAs: [],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: `+91-${HELP_NUMBER}`,
        contactType: "customer support",
        email: EMAIL_SUPPORT,
        availableLanguage: ["English", "Hindi"],
      },
    ],
  };
}

export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ChatBoatAI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "All-in-one CRM for leads, contacts, sales pipeline, follow-ups and automation, with WhatsApp and other business integrations in one dashboard.",
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/pricing`,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqPageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function contactPageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact ChatBoatAI",
    url: `${SITE_URL}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      email: EMAIL_INFO,
      telephone: `+91-${HELP_NUMBER}`,
    },
  };
}

function crumbs(...trail: Array<{ name: string; path: string }>) {
  return breadcrumbJsonLd([{ name: "Home", path: "/" }, ...trail]);
}

/** SEO for public content / marketing pages only. */
export const CONTENT_SEO: Record<string, SeoPageConfig> = {
  "/": {
    path: "/",
    title: "All-in-One CRM & Business Integrations | ChatBoatAI",
    description:
      "Manage leads, contacts, sales pipeline, follow-ups and automation in one CRM dashboard — with WhatsApp and your business tools connected. Simple monthly plans.",
    keywords: DEFAULT_KEYWORDS,
    jsonLd: [softwareApplicationJsonLd()],
  },
  "/features": {
    path: "/features",
    title: "CRM Features: Leads, Pipeline & Follow-ups | ChatBoatAI",
    description:
      "ChatBoatAI CRM features: leads, contacts, deals, a visual sales pipeline, follow-ups and tasks on one dashboard, with the WhatsApp integration built in. Automation and AI coming soon.",
    keywords:
      "CRM features, lead management, sales pipeline, follow-up tracking, deal tracking, WhatsApp CRM, ChatBoatAI",
    jsonLd: [
      crumbs({ name: "Features", path: "/features" }),
      softwareApplicationJsonLd(),
    ],
  },
  "/crm": {
    path: "/crm",
    title: "CRM for Growing Businesses | Leads, Deals & Pipeline | ChatBoatAI",
    description:
      "ChatBoatAI CRM: leads, contacts, deals, a visual sales pipeline, follow-ups and tasks in one dashboard, with WhatsApp built in. See what's live today and what's coming next.",
    keywords: "CRM software India, sales CRM, lead management CRM, sales pipeline CRM, WhatsApp CRM, ChatBoatAI",
    jsonLd: [crumbs({ name: "CRM", path: "/crm" }), softwareApplicationJsonLd()],
  },
  "/integrations": {
    path: "/integrations",
    title: "CRM Integrations: WhatsApp & More | ChatBoatAI",
    description:
      "Connect your business tools to one CRM. The official WhatsApp Business integration is live; Gmail, Facebook Leads, Google, Google Calendar, Slack, Zapier and HubSpot are coming soon.",
    keywords: "CRM integrations, WhatsApp CRM integration, WhatsApp Business API, CRM Gmail integration, ChatBoatAI integrations",
    jsonLd: [crumbs({ name: "Integrations", path: "/integrations" }), softwareApplicationJsonLd()],
  },
  "/trust": {
    path: "/trust",
    title: "Trust & Data Security | ChatBoatAI CRM",
    description:
      "How ChatBoatAI protects your CRM data: workspace isolation on every request, hashed passwords, HTTPS, Razorpay payments and an official Meta WhatsApp integration.",
    keywords:
      "CRM data security, workspace isolation, secure CRM, official WhatsApp API, ChatBoatAI trust",
    jsonLd: [crumbs({ name: "Trust", path: "/trust" })],
  },
  "/how-it-works": {
    path: "/how-it-works",
    title: "How ChatBoatAI CRM Works | From Lead to Closed Deal",
    description:
      "Set up your CRM in an afternoon: add or import leads, build your sales pipeline, schedule follow-ups, then connect WhatsApp to message customers from the same workspace.",
    keywords:
      "how CRM works, CRM setup, sales pipeline setup, lead follow-up, WhatsApp CRM integration, ChatBoatAI",
    jsonLd: [crumbs({ name: "How it works", path: "/how-it-works" })],
  },
  "/setup-guide": {
    path: "/setup-guide",
    title: "ChatBoatAI Setup Guide | CRM & WhatsApp Integration",
    description:
      "Step-by-step guide to set up your ChatBoatAI CRM — leads, deals and follow-ups — and connect the WhatsApp Business integration through Meta's official platform.",
    keywords:
      "CRM setup guide, WhatsApp Business API setup, Meta embedded signup, WhatsApp integration, ChatBoatAI",
    jsonLd: [crumbs({ name: "Setup guide", path: "/setup-guide" })],
  },
  "/use-cases": {
    path: "/use-cases",
    title: "CRM Use Cases for Real Estate, Education & More | ChatBoatAI",
    description:
      "How real estate, education, D2C and agency teams use ChatBoatAI to track leads, run a sales pipeline, schedule follow-ups and message customers on WhatsApp.",
    keywords:
      "CRM for real estate, CRM for education, CRM for agencies, sales CRM India, WhatsApp CRM, ChatBoatAI",
    jsonLd: [crumbs({ name: "Use cases", path: "/use-cases" })],
  },
  "/proof": {
    path: "/proof",
    title: "Our Commitments | ChatBoatAI",
    description:
      "The commitments ChatBoatAI makes to customers: no over-promising, clear monthly pricing, and human support when you need it.",
    keywords:
      "ChatBoatAI reviews, ChatBoatAI customers, CRM testimonials, WhatsApp CRM customers",
    jsonLd: [crumbs({ name: "Proof", path: "/proof" })],
  },
  "/pricing": {
    path: "/pricing",
    title: "CRM Pricing Plans | ChatBoatAI",
    description:
      "Simple ChatBoatAI plans that include the CRM — leads, deals, pipeline, follow-ups and tasks — plus the WhatsApp integration. Pay securely with Razorpay and activate instantly.",
    keywords:
      "CRM pricing India, CRM subscription plans, WhatsApp CRM pricing, ChatBoatAI plans",
    jsonLd: [
      crumbs({ name: "Pricing", path: "/pricing" }),
      softwareApplicationJsonLd(),
    ],
  },
  "/faq": {
    path: "/faq",
    title: "ChatBoatAI FAQ | CRM, WhatsApp Integration & Billing",
    description:
      "What ChatBoatAI does today and what's coming soon, how the WhatsApp integration works, Meta conversation charges and billing — answered.",
    keywords:
      "ChatBoatAI FAQ, CRM questions, WhatsApp integration FAQ, Meta conversation charges, CRM pricing",
    jsonLd: [crumbs({ name: "FAQ", path: "/faq" }), faqPageJsonLd()],
  },
  "/contact": {
    path: "/contact",
    title: "Contact ChatBoatAI | Sales & Support",
    description:
      "Contact ChatBoatAI for CRM setup, WhatsApp integration, billing and support. Call +91 9336791807 or email thecleverwork@gmail.com.",
    keywords:
      "contact ChatBoatAI, CRM support, WhatsApp integration support, billing support",
    jsonLd: [crumbs({ name: "Contact", path: "/contact" }), contactPageJsonLd()],
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy Policy | ChatBoatAI",
    description:
      "How ChatBoatAI collects, uses and protects personal data across our CRM and WhatsApp integration. Read our privacy practices before you create an account.",
    keywords: "ChatBoatAI privacy policy, WhatsApp data privacy, personal data protection",
    jsonLd: [crumbs({ name: "Privacy Policy", path: "/privacy" })],
  },
  "/terms": {
    path: "/terms",
    title: "Terms of Service | ChatBoatAI",
    description:
      "Terms governing use of ChatBoatAI's CRM and integrations, including accounts, acceptable use, billing, service limits and your responsibilities as a customer.",
    keywords: "ChatBoatAI terms of service, WhatsApp platform terms, acceptable use policy",
    jsonLd: [crumbs({ name: "Terms of Service", path: "/terms" })],
  },
  "/refund": {
    path: "/refund",
    title: "Refund Policy | ChatBoatAI",
    description:
      "ChatBoatAI refund policy for subscription billing. Learn when refunds apply, what is excluded, and how to request billing help.",
    keywords: "ChatBoatAI refund policy, WhatsApp API billing refund, subscription refund",
    jsonLd: [crumbs({ name: "Refund Policy", path: "/refund" })],
  },
  "/delete-data": {
    path: "/delete-data",
    title: "User Data Deletion Requests | ChatBoatAI Privacy",
    description:
      "Request deletion of your ChatBoatAI account and associated CRM and WhatsApp data. Steps for data removal requests, timelines and support contacts.",
    keywords: "data deletion request, GDPR delete account, ChatBoatAI delete data, WhatsApp data removal",
    jsonLd: [crumbs({ name: "Data Deletion", path: "/delete-data" })],
  },
};

/** Auth pages: crawlable URL but noindex. */
export const AUTH_SEO: Record<string, SeoPageConfig> = {
  "/login": {
    path: "/login",
    title: "Log In | ChatBoatAI",
    description: "Sign in to your ChatBoatAI CRM workspace.",
    robots: "noindex, nofollow",
  },
  "/admin-login": {
    path: "/admin-login",
    title: "Admin Log In | ChatBoatAI",
    description: "Admin sign-in for the ChatBoatAI platform.",
    robots: "noindex, nofollow",
  },
};

export function getContentSeo(pathname: string): SeoPageConfig | null {
  const path = pathname.split("?")[0] || "/";
  return CONTENT_SEO[path] ?? null;
}

export function buildCanonical(path: string): string {
  return absoluteUrl(path);
}
