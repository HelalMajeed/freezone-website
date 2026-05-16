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
  hikvision: { slug: "hikvision", color: "E60012" },
  dahua: { slug: "dahua", color: "E60012" },
  secretlab: { slug: "secretlab", color: "111827" },
  ducky: { slug: "ducky", color: "111827" },
  eureka: { slug: "eureka", color: "111827" },
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

function isSvgUrl(url: string): boolean {
  const u = url.split("?")[0]?.toLowerCase() ?? "";
  return u.endsWith(".svg") || u.includes("simpleicons.org");
}

/**
 * Logo sources in priority order — SVG first for sharp rendering on retina.
 */
export function buildBrandLogoCandidates(name: string, explicitImg: string | null): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    const t = u.trim();
    if (t && !out.includes(t)) out.push(t);
  };

  const key = normalizeBrandKey(name);
  const alias = BRAND_ICON_ALIASES[key];
  const slug = alias?.slug ?? key;

  if (explicitImg?.trim()) {
    const img = explicitImg.trim();
    if (isSvgUrl(img)) push(img);
    else push(img);
  }

  if (slug.length >= 2) {
    push(`/brands/${slug}.svg`);
    push(simpleIconsSvgUrl(slug, alias?.color ?? "1f2937"));
  }

  if (explicitImg?.trim() && !isSvgUrl(explicitImg)) {
    push(explicitImg.trim());
  }

  return out;
}
