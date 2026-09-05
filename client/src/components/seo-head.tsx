import { useEffect } from "react";
import {
  SITE_NAME,
  SITE_AUTHOR,
  SITE_PUBLISHER,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  DEFAULT_KEYWORDS,
  buildCanonical,
  organizationJsonLd,
  getContentSeo,
  AUTH_SEO,
  type SeoPageConfig,
  type SeoRobots,
} from "@/lib/seo";

const MANAGED_ATTR = "data-convora-seo";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  // Prefer updating an existing static tag so we never create duplicate canonicals/metas.
  let el =
    document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"][${MANAGED_ATTR}]`) ||
    document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el =
    document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][${MANAGED_ATTR}]`) ||
    document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id: string, data: Record<string, unknown>[]) {
  let el = document.head.querySelector<HTMLScriptElement>(
    `script[type="application/ld+json"]#${id}`,
  );
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data.length === 1 ? data[0] : data);
}

function clearManagedSeo() {
  // Only remove tags we created — leave the static index.html baseline intact.
  document.head.querySelectorAll(`[${MANAGED_ATTR}]`).forEach((node) => node.remove());
}

export type SeoHeadProps = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  robots?: SeoRobots;
  ogType?: "website" | "article";
  image?: string;
  jsonLd?: Record<string, unknown>[];
  includeOrganization?: boolean;
};

/** Applies document head SEO for content pages (title, meta, OG, Twitter, JSON-LD). */
export function SeoHead({
  title,
  description,
  path,
  keywords = DEFAULT_KEYWORDS,
  robots = "index, follow",
  ogType = "website",
  image = DEFAULT_OG_IMAGE,
  jsonLd,
  includeOrganization = true,
}: SeoHeadProps) {
  const jsonLdKey = JSON.stringify(jsonLd ?? []);

  useEffect(() => {
    const canonical = buildCanonical(path);
    const fullTitle = title;

    document.title = fullTitle;
    document.documentElement.lang = "en";

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords);
    upsertMeta("name", "author", SITE_AUTHOR);
    upsertMeta("name", "publisher", SITE_PUBLISHER);
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "googlebot", robots);
    upsertLink("canonical", canonical);
    upsertLink("author", SITE_URL);
    upsertLink("publisher", SITE_URL);

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "en_IN");
    upsertMeta("property", "article:author", SITE_AUTHOR);
    upsertMeta("property", "article:publisher", SITE_URL);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    const schemas: Record<string, unknown>[] = [];
    if (includeOrganization) {
      schemas.push(organizationJsonLd());
    }
    if (jsonLd?.length) {
      schemas.push(...jsonLd);
    }
    if (schemas.length > 0) {
      upsertJsonLd("convora-seo-jsonld", schemas);
    }

    return () => {
      clearManagedSeo();
    };
  }, [
    title,
    description,
    path,
    keywords,
    robots,
    ogType,
    image,
    jsonLdKey,
    includeOrganization,
    jsonLd,
  ]);

  return null;
}

export function SeoFromConfig({
  config,
  includeOrganization = true,
}: {
  config: SeoPageConfig;
  includeOrganization?: boolean;
}) {
  return (
    <SeoHead
      title={config.title}
      description={config.description}
      path={config.path}
      keywords={config.keywords}
      robots={config.robots}
      ogType={config.ogType}
      jsonLd={config.jsonLd}
      includeOrganization={includeOrganization}
    />
  );
}

/** Resolve and apply SEO for a public content path. */
export function ContentSeo({ path }: { path: string }) {
  const config = getContentSeo(path);
  if (!config) return null;
  return <SeoFromConfig config={config} />;
}

/** Apply noindex SEO for auth pages. */
export function AuthSeo({ path }: { path: "/login" | "/admin-login" }) {
  const config = AUTH_SEO[path];
  if (!config) return null;
  return <SeoFromConfig config={config} includeOrganization={false} />;
}
