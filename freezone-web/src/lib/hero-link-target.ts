/**
 * Structured hero CTA targets (stored as JSON on `HeroSlide.primaryLink` / `secondaryLink`).
 * Prefer `kind: "catalog"` (قسم → صنف/علامة → منتج). Legacy: `product` | `category` | `brand` + `url`.
 */

export type HeroCatalogLink = {
  kind: "catalog";
  categorySlug: string;
  /** علامة / صنف داخل القسم (اختياري) */
  brandSlug?: string | null;
  /** منتج محدد (اختياري) */
  productId?: number | null;
};

export type HeroLinkTarget =
  | { kind: "url"; href: string }
  | HeroCatalogLink
  /** @deprecated prefer `catalog` */
  | { kind: "product"; productId: number }
  /** @deprecated prefer `catalog` with categorySlug only */
  | { kind: "category"; slug: string }
  /** @deprecated prefer `catalog` */
  | { kind: "brand"; slug: string };

export function parseHeroLinkTarget(raw: unknown): HeroLinkTarget | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const kind = o.kind;
  if (kind === "url" && typeof o.href === "string" && o.href.trim()) {
    return { kind: "url", href: o.href.trim() };
  }
  if (kind === "catalog" && typeof o.categorySlug === "string" && o.categorySlug.trim()) {
    const categorySlug = o.categorySlug.trim();
    const brandSlug =
      typeof o.brandSlug === "string" && o.brandSlug.trim() ? o.brandSlug.trim() : null;
    let productId: number | null = null;
    if (o.productId != null) {
      const id = typeof o.productId === "number" ? o.productId : Number(o.productId);
      if (Number.isFinite(id) && id > 0) productId = Math.round(id);
    }
    return { kind: "catalog", categorySlug, brandSlug, productId };
  }
  if (kind === "product") {
    const id = typeof o.productId === "number" ? o.productId : Number(o.productId);
    if (Number.isFinite(id) && id > 0) return { kind: "product", productId: Math.round(id) };
  }
  if (kind === "category" && typeof o.slug === "string" && o.slug.trim()) {
    return { kind: "category", slug: o.slug.trim() };
  }
  if (kind === "brand" && typeof o.slug === "string" && o.slug.trim()) {
    return { kind: "brand", slug: o.slug.trim() };
  }
  return null;
}

function normalizeFallback(fallbackHref: string): string {
  const fb = (fallbackHref && String(fallbackHref).trim()) || "/products";
  if (/^https?:\/\//i.test(fb) || fb.startsWith("//")) return fb;
  return fb.startsWith("/") ? fb : `/${fb}`;
}

function buildProductsQuery(cat: string, brand?: string | null): string {
  const q = new URLSearchParams();
  q.set("cat", cat);
  if (brand && brand.trim()) q.set("brand", brand.trim());
  return `/products?${q.toString()}`;
}

/** Resolve stored target + legacy href to a single href for storefront / preview. */
export function resolveHeroLinkTargetToHref(
  target: HeroLinkTarget | null | undefined,
  fallbackHref: string,
): string {
  const fb = normalizeFallback(fallbackHref);
  if (!target) return fb;
  switch (target.kind) {
    case "url": {
      const h = target.href.trim();
      if (!h) return fb;
      if (/^https?:\/\//i.test(h) || h.startsWith("//")) return h;
      return h.startsWith("/") ? h : `/${h}`;
    }
    case "catalog": {
      if (target.productId != null && target.productId > 0) {
        return `/product/${target.productId}`;
      }
      return buildProductsQuery(target.categorySlug, target.brandSlug);
    }
    case "product":
      return `/product/${target.productId}`;
    case "category":
      return `/products?cat=${encodeURIComponent(target.slug)}`;
    case "brand":
      return `/products?brand=${encodeURIComponent(target.slug)}`;
    default:
      return fb;
  }
}

/** UI mode: manual URL vs structured catalog picker */
export function inferHeroLinkModeFromTarget(target: unknown): "url" | "catalog" {
  const t = parseHeroLinkTarget(target);
  if (!t || t.kind === "url") return "url";
  return "catalog";
}
