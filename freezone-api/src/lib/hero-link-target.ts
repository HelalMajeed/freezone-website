/**
 * Structured hero CTA targets (stored as JSON on `HeroSlide.primaryLink` / `secondaryLink`).
 * Legacy rows use only `primaryHref` / `secondaryHref` strings.
 */

export type HeroLinkTarget =
  | { kind: "url"; href: string }
  | { kind: "product"; productId: number }
  | { kind: "category"; slug: string }
  | { kind: "brand"; slug: string };

export function parseHeroLinkTarget(raw: unknown): HeroLinkTarget | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const kind = o.kind;
  if (kind === "url" && typeof o.href === "string" && o.href.trim()) {
    return { kind: "url", href: o.href.trim() };
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

export function inferHeroLinkModeFromTarget(target: unknown): "url" | "product" | "category" | "brand" {
  const t = parseHeroLinkTarget(target);
  if (!t) return "url";
  return t.kind;
}
