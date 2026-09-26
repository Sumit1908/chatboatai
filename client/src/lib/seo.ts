/** Canonical production origin — must match the live app host. */
export const SITE_URL = "https://chatboatai.in";
export const SITE_NAME = "ChatBoatAI";
export const SITE_AUTHOR = "ChatBoatAI";
export const SITE_PUBLISHER = "ChatBoatAI";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const DEFAULT_KEYWORDS =
  "CRM software, CRM management, custom CRM setup, CRM configuration, CRM integration support, lead management CRM, sales CRM, real estate CRM, CRM software India, ChatBoatAI CRM";

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
    sameAs: [],
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
      "CRM software to manage leads, deals, sales pipelines, tasks, follow-ups and customer conversations, with custom CRM setup, configuration and integration support from the ChatBoatAI team.",
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

export function contactPageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact ChatBoatAI",
    url: `${SITE_URL}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
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
    title: "ChatBoatAI CRM — CRM Software, Custom Setup & Integration Support",
    description:
      "CRM software to manage leads, deals, sales pipelines and follow-ups from one dashboard, with custom CRM setup, configuration and integration support from the ChatBoatAI team.",
    keywords: DEFAULT_KEYWORDS,
    jsonLd: [softwareApplicationJsonLd()],
  },
  "/pricing": {
    path: "/pricing",
    title: "CRM Software Pricing | ChatBoatAI",
    description:
      "Simple monthly ChatBoatAI plans: the CRM for leads, deals, pipeline, tasks and follow-ups, plus WhatsApp. Pay securely with Razorpay, or talk to us about a custom CRM setup.",
    keywords: "CRM software pricing, CRM plans India, sales CRM pricing, ChatBoatAI plans",
    jsonLd: [
      crumbs({ name: "Pricing", path: "/pricing" }),
      softwareApplicationJsonLd(),
    ],
  },
  "/contact": {
    path: "/contact",
    title: "Contact ChatBoatAI | Custom CRM Setup & Support",
    description:
      "Tell us about your business, workflow and integrations - our team will help you set up the right CRM. Support and billing questions welcome too.",
    keywords: "custom CRM setup, CRM implementation, CRM integrations, contact ChatBoatAI",
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
      "Request deletion of your ChatBoatAI account and associated CRM and WhatsApp data through our Contact page, and what information to include.",
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
