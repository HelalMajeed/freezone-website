import { canonicalSitePath, publicSiteBaseUrl } from "./Seo";
import { safeJsonLd } from "./jsonLd";

export type BreadcrumbItem = {
  /** Human-readable label shown in the SERP breadcrumb trail. */
  name: string;
  /** Locale-prefixed, site-relative path (e.g. `/en/category/laptops`). */
  path: string;
};

/**
 * schema.org BreadcrumbList structured data (Home → Category/Brand → Product).
 *
 * Emits absolute `item` URLs so the trail matches the canonical URLs declared
 * by <Seo>. Rendered on the product, category and brand pages; the build-time
 * prerender (scripts/prerender.mjs) emits the identical JSON-LD for crawlers
 * that do not execute JS.
 */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  const base = publicSiteBaseUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${base}${canonicalSitePath(it.path)}`,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}
