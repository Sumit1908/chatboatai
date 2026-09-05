import { faqs, EMAIL_INFO, EMAIL_SUPPORT, HELP_NUMBER } from "./marketing-content";

/** Canonical production origin — must match the live app host. */
export const SITE_URL = "https://sampark.tech";
export const SITE_NAME = "Sampark";
export const SITE_AUTHOR = "Sampark";
export const SITE_PUBLISHER = "Sampark";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const DEFAULT_KEYWORDS =
  "WhatsApp Business API, WhatsApp marketing, WhatsApp broadcast, WhatsApp campaigns, Meta Cloud API, WhatsApp inbox, message templates, Sampark";

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
    name: "Sampark",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "WhatsApp Business API platform for broadcast campaigns, templates, shared inbox, and real-time delivery analytics.",
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
    name: "Contact Sampark",
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
    title: "WhatsApp Business API Platform for Teams | Sampark",
    description:
      "Broadcast WhatsApp campaigns with Meta-approved templates, shared team inbox and live delivery analytics. Start free with Sampark.",
    keywords: DEFAULT_KEYWORDS,
    jsonLd: [softwareApplicationJsonLd()],
  },
  "/features": {
    path: "/features",
    title: "WhatsApp Marketing Features & Inbox | Sampark",
    description:
      "Explore Sampark features: broadcast campaigns, Meta template manager, shared inbox, contact lists, tags and real-time WhatsApp delivery analytics for growing teams.",
    keywords:
      "WhatsApp marketing features, WhatsApp broadcast, WhatsApp shared inbox, Meta template manager, WhatsApp analytics, Sampark",
    jsonLd: [
      crumbs({ name: "Features", path: "/features" }),
      softwareApplicationJsonLd(),
    ],
  },
  "/trust": {
    path: "/trust",
    title: "Trusted Official Meta WhatsApp API | Sampark",
    description:
      "Sampark runs on the official Meta WhatsApp Business Platform. Transparent delivery, secure workspaces and reliable Cloud API messaging your customers can trust.",
    keywords:
      "official WhatsApp Business API, Meta Cloud API, WhatsApp trust, secure WhatsApp messaging, Sampark",
    jsonLd: [crumbs({ name: "Trust", path: "/trust" })],
  },
  "/how-it-works": {
    path: "/how-it-works",
    title: "How WhatsApp Campaigns Work on Sampark",
    description:
      "Connect Meta API, create approved templates, then launch and track WhatsApp broadcast campaigns in real time with Sampark — from signup to first send in days.",
    keywords:
      "how WhatsApp campaigns work, WhatsApp broadcast steps, Meta API setup, WhatsApp templates, Sampark",
    jsonLd: [crumbs({ name: "How it works", path: "/how-it-works" })],
  },
  "/setup-guide": {
    path: "/setup-guide",
    title: "WhatsApp Business API Setup Guide | Sampark",
    description:
      "Step-by-step guide to connect Meta Business, WhatsApp Cloud API, message templates and your first Sampark campaign so your team can go live in days, not weeks.",
    keywords:
      "WhatsApp Business API setup, Meta embedded signup, WABA setup guide, WhatsApp Cloud API, Sampark",
    jsonLd: [crumbs({ name: "Setup guide", path: "/setup-guide" })],
  },
  "/use-cases": {
    path: "/use-cases",
    title: "WhatsApp Business Use Cases for Teams | Sampark",
    description:
      "See how sales, support and marketing teams use Sampark for WhatsApp broadcasts, follow-ups, order notifications and shared inbox replies that convert conversations.",
    keywords:
      "WhatsApp use cases, WhatsApp for sales, WhatsApp customer support, WhatsApp notifications, Sampark",
    jsonLd: [crumbs({ name: "Use cases", path: "/use-cases" })],
  },
  "/proof": {
    path: "/proof",
    title: "WhatsApp Delivery Results & Campaign Proof",
    description:
      "Real delivery transparency on WhatsApp: sent, delivered, read and failed tracked live per campaign with Sampark analytics so you always know what customers received.",
    keywords:
      "WhatsApp delivery reports, WhatsApp read receipts, campaign analytics, message tracking, Sampark",
    jsonLd: [crumbs({ name: "Proof", path: "/proof" })],
  },
  "/pricing": {
    path: "/pricing",
    title: "WhatsApp API Pricing Plans & Free Trial",
    description:
      "Simple Sampark plans for WhatsApp Business API broadcasting. Free trial included — Meta conversation fees billed at Meta rates with no platform markup on messages.",
    keywords:
      "WhatsApp API pricing, WhatsApp Business API cost, Sampark plans, WhatsApp free trial, Meta conversation fees",
    jsonLd: [
      crumbs({ name: "Pricing", path: "/pricing" }),
      softwareApplicationJsonLd(),
    ],
  },
  "/faq": {
    path: "/faq",
    title: "WhatsApp Business API FAQ Answered | Sampark",
    description:
      "Answers about official WhatsApp Business API, Meta conversation charges, template approval times, shared team inbox and Sampark free trials — clear and up to date.",
    keywords:
      "WhatsApp Business API FAQ, Meta conversation charges, WhatsApp template approval, Sampark help",
    jsonLd: [crumbs({ name: "FAQ", path: "/faq" }), faqPageJsonLd()],
  },
  "/contact": {
    path: "/contact",
    title: "Contact Sampark Support | WhatsApp API Help",
    description:
      "Contact Sampark for WhatsApp Business API setup, billing and support. Call +91 9217730926 or email info@sampark.tech and support@sampark.tech — we reply within 24 hours.",
    keywords:
      "contact Sampark, WhatsApp API support, Sampark help desk, billing support, Sampark phone",
    jsonLd: [crumbs({ name: "Contact", path: "/contact" }), contactPageJsonLd()],
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy Policy | Sampark WhatsApp Platform",
    description:
      "How Sampark collects, uses and protects personal data on our WhatsApp Business API broadcasting platform. Read our privacy practices before you create an account.",
    keywords: "Sampark privacy policy, WhatsApp data privacy, personal data protection",
    jsonLd: [crumbs({ name: "Privacy Policy", path: "/privacy" })],
  },
  "/terms": {
    path: "/terms",
    title: "Terms of Service | Sampark WhatsApp Platform",
    description:
      "Terms governing use of Sampark’s WhatsApp Business API platform, including accounts, acceptable use, billing, service limits and your responsibilities as a customer.",
    keywords: "Sampark terms of service, WhatsApp platform terms, acceptable use policy",
    jsonLd: [crumbs({ name: "Terms of Service", path: "/terms" })],
  },
  "/refund": {
    path: "/refund",
    title: "Refund Policy for Sampark Billing Plans",
    description:
      "Sampark refund policy for subscription billing on our WhatsApp Business API platform. Learn when refunds apply, what is excluded, and how to request billing help.",
    keywords: "Sampark refund policy, WhatsApp API billing refund, subscription refund",
    jsonLd: [crumbs({ name: "Refund Policy", path: "/refund" })],
  },
  "/delete-data": {
    path: "/delete-data",
    title: "User Data Deletion Requests | Sampark Privacy",
    description:
      "Request deletion of your Sampark account and associated WhatsApp workspace data. Steps for GDPR-style user data removal requests, timelines and support contacts.",
    keywords: "data deletion request, GDPR delete account, Sampark delete data, WhatsApp data removal",
    jsonLd: [crumbs({ name: "Data Deletion", path: "/delete-data" })],
  },
};

/** Auth pages: crawlable URL but noindex. */
export const AUTH_SEO: Record<string, SeoPageConfig> = {
  "/login": {
    path: "/login",
    title: "Log In | Sampark",
    description: "Sign in to your Sampark WhatsApp Business API workspace.",
    robots: "noindex, nofollow",
  },
  "/admin-login": {
    path: "/admin-login",
    title: "Admin Log In | Sampark",
    description: "Admin sign-in for the Sampark platform.",
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
