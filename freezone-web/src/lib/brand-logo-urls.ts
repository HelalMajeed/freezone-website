import { getApiInternalBase } from "@/lib/api-internal";

/** Simple Icons slug + optional hex color for crisp SVG wordmarks. */
const BRAND_ICON_ALIASES: Record<string, { slug: string; color?: string }> = {
  adata: { slug: "adata" },
  logitech: { slug: "logitech", color: "00B8FC" },
  logi: { slug: "logitech", color: "00B8FC" },
  apple: { slug: "apple", color: "000000" },
  gigabyte: { slug: "gigabyte", color: "E60012" },
  msi: { slug: "msi", color: "E60012" },
  hp: { slug: "hp", color: "0096D6" },
  hewlettpackard: { slug: "hp", color: "0096D6" },
  lenovo: { slug: "lenovo", color: "E2231A" },
  asus: { slug: "asus", color: "000000" },
  dell: { slug: "dell", color: "007DB8" },
  intel: { slug: "intel", color: "0071C5" },
  amd: { slug: "amd", color: "ED1C24" },
  nvidia: { slug: "nvidia", color: "76B900" },
  samsung: { slug: "samsung", color: "1428A0" },
  lg: { slug: "lg", color: "A50034" },
  razer: { slug: "razer", color: "00FF00" },
  steelseries: { slug: "steelseries", color: "FF5200" },
  nzxt: { slug: "nzxt", color: "5A2D82" },
  corsair: { slug: "corsair", color: "000000" },
  hikvision: { slug: "hikvision" },
  dahua: { slug: "dahua" },
  secretlab: { slug: "secretlab" },
  ducky: { slug: "ducky" },
  eureka: { slug: "eureka" },
  cisco: { slug: "cisco", color: "1BA0D7" },
  microsoft: { slug: "microsoft", color: "5E5E5E" },
  canon: { slug: "canon", color: "BC0024" },
  epson: { slug: "epson", color: "003399" },
  tplink: { slug: "tplink", color: "4ACBD6" },
};

export function normalizeBrandKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function resolveBrandIconSlug(name: string): string {
  const key = normalizeBrandKey(name);
  return BRAND_ICON_ALIASES[key]?.slug ?? key;
}

function simpleIconsSvgUrl(slug: string, color = "1f2937"): string {
  const hex = color.replace(/^#/, "");
  return `https://cdn.simpleicons.org/${slug}/${hex}`;
}

/** Legacy DB seed paths like `/brands/b12-nzxt.svg` are not deployed on the API host. */
function isLegacySeededBrandPath(url: string): boolean {
  return /^\/brands\/b\d+-/i.test(url.trim());
}

/** Resolve `/uploads/...` to API origin in production; keep same-origin in dev. */
export function resolveBrandAssetUrl(url: string): string {
  const t = url.trim();
  if (!t || isLegacySeededBrandPath(t)) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/uploads/")) {
    const base = getApiInternalBase();
    return base ? `${base}${t}` : t;
  }
  if (t.startsWith("/")) return t;
  return t;
}

/**
 * Logo sources in priority order — bundled SVG in /public/brands first (works on Netlify),
 * then CDN, then admin upload URL.
 */
export function buildBrandLogoCandidates(name: string, explicitImg: string | null): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    const t = resolveBrandAssetUrl(u);
    if (t && !out.includes(t)) out.push(t);
  };

  const key = normalizeBrandKey(name);
  const alias = BRAND_ICON_ALIASES[key];
  const slug = alias?.slug ?? key;

  if (slug.length >= 2) {
    push(`/brands/${slug}.svg`);
    push(simpleIconsSvgUrl(slug, alias?.color ?? "1f2937"));
  }

  if (explicitImg?.trim()) {
    push(explicitImg.trim());
  }

  return out;
}
