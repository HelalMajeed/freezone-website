// Map a Shopify product JSON onto the shape the FreeZone Prisma client needs.
//
// Ported (and tightened) from `scripts/import-globaliraq/lib/map-product.mjs`.
// The CLI script still uses that .mjs copy. Both apply the same rules:
//
//   oldPrice  ⇐ first Shopify variant price, unchanged
//   price     ⇐ round(oldPrice × markup)               (markup default 1.35)
//   warranty  ⇐ "ضمان سنتين وكالة" by default (Sprint 3 wires real doubling)
//   sourceUrl / sourceHandle / sourcePrice / importedAt / importBatchId all set
//
// `specs` JSON gets the warranty + any flat `<li><strong>Key:</strong> Value</li>`
// pair found in body_html. Variants carry their full option triple + a
// `imageSourceUrl` pointer the caller resolves to a /uploads/... URL once the
// images have been mirrored.

import { parseAndDoubleWarranty } from "./warranty";

export const DEFAULT_MARKUP = 1.35;
export const DEFAULT_WARRANTY_AR = "ضمان سنتين وكالة";

/** Scan a Shopify body_html blob for an existing warranty phrase so we can
 *  double it instead of always falling back to the default. Returns the first
 *  short line mentioning ضمان / كفالة / warranty, or null. */
export function findWarrantyInText(html: string): string | null {
  if (!html) return null;
  const text = html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|li|div|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");
  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line || line.length > 120) continue;
    if (/(ضمان|كفالة|warranty)/i.test(line)) return line;
  }
  return null;
}

export interface ShopifyImage {
  id?: number | string;
  src?: string;
  alt?: string | null;
  position?: number;
}

export interface ShopifyVariant {
  id?: number | string;
  sku?: string;
  title?: string;
  price?: string | number;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  image_id?: number | string | null;
  inventory_quantity?: number;
  available?: boolean;
}

export interface ShopifyProduct {
  id?: number | string;
  handle: string;
  title?: string;
  vendor?: string;
  product_type?: string;
  body_html?: string;
  tags?: string[] | string;
  options?: Array<{ name?: string }>;
  variants?: ShopifyVariant[];
  images?: ShopifyImage[];
}

export interface MappedProductPayload {
  nameEn: string;
  nameAr: string;
  brand: string;
  sku: string;
  model: string;
  descEn: string;
  descAr: string;
  price: number;
  oldPrice: number | null;
  warranty: string;
  specs: Record<string, string>;
  quantity: number;
  published: boolean;
  isNew: boolean;
  sourceUrl: string | null;
  sourceHandle: string;
  sourcePrice: number | null;
  importedAt: string;
  importBatchId: string | null;
}

export interface MappedImage {
  sourceUrl: string;
  alt: string;
  position: number;
  shopifyImageId: string | null;
}

export interface MappedVariant {
  sku: string;
  labelEn: string;
  labelAr: string;
  priceOverride: number | null;
  oldPrice: number | null;
  optionName1: string | null;
  optionValue1: string | null;
  optionName2: string | null;
  optionValue2: string | null;
  optionName3: string | null;
  optionValue3: string | null;
  imageSourceUrl: string | null;
  sourceVariantId: string | null;
  sourceRawJson: ShopifyVariant;
  quantity: number;
  active: boolean;
  sortOrder: number;
}

export interface MappedProduct {
  productPayload: MappedProductPayload;
  images: MappedImage[];
  variants: MappedVariant[];
  flags: { missingPrice: boolean; noImages: boolean };
  sourceMeta: {
    source: string;
    handle: string;
    url: string | null;
    product_type: string | null;
    vendor: string | null;
    title: string | null;
    tags: string[] | string;
  };
}

export interface MapOptions {
  source?: string;
  baseUrl?: string;
  importBatchId?: string | null;
  markup?: number;
  warrantyAr?: string;
}

export function shopifyToFreezone(shopify: ShopifyProduct, opts: MapOptions = {}): MappedProduct {
  const source = opts.source ?? "globaliraq";
  const markup = opts.markup ?? DEFAULT_MARKUP;
  const warrantyAr = opts.warrantyAr ?? DEFAULT_WARRANTY_AR;
  const baseUrl = opts.baseUrl?.replace(/\/$/, "") ?? null;
  const sourceUrl = baseUrl ? `${baseUrl}/products/${shopify.handle}` : null;

  const firstVariant: ShopifyVariant | null = shopify.variants?.[0] ?? null;
  const shopifyPrice = firstVariant ? parsePriceToInt(firstVariant.price) : null;
  const oldPrice = shopifyPrice;
  const price = shopifyPrice != null ? Math.round(shopifyPrice * markup) : null;

  const sku = (firstVariant?.sku ?? "").trim();
  const modelName = (shopify.title ?? "").trim();

  const descHtml = cleanBodyHtml(shopify.body_html ?? "");
  const descPlain = htmlToPlainText(descHtml);

  const specs = extractFlatSpecs(shopify.body_html ?? "");
  /** Source warranty: prefer an explicit `<li>Warranty: …</li>` spec, else scan
   *  the body text. Double whatever we find; fall back to the policy default. */
  const sourceWarranty = specs.warranty ?? findWarrantyInText(shopify.body_html ?? "");
  const finalWarranty = parseAndDoubleWarranty(sourceWarranty, warrantyAr);
  specs.warranty = finalWarranty;
  /** snake_case key required by validateProductSpecsAgainstSchema. */
  if (shopify.vendor) specs.brand_source = shopify.vendor;

  const optionNames: Array<string | null> = (shopify.options ?? []).map((o) => o?.name ?? null);
  const imageById = new Map<string, string>();
  for (const img of shopify.images ?? []) {
    if (img.id != null && typeof img.src === "string") imageById.set(String(img.id), img.src);
  }

  const variants: MappedVariant[] = (shopify.variants ?? []).map((v, i) => {
    const priceOverride = parsePriceToInt(v.price);
    return {
      sku: (v.sku ?? "").trim(),
      labelEn: (v.title ?? v.option1 ?? "").trim(),
      labelAr: (v.title ?? v.option1 ?? "").trim(),
      priceOverride: priceOverride != null ? Math.round(priceOverride * markup) : null,
      oldPrice: priceOverride,
      optionName1: optionNames[0] ?? null,
      optionValue1: v.option1 ?? null,
      optionName2: optionNames[1] ?? null,
      optionValue2: v.option2 ?? null,
      optionName3: optionNames[2] ?? null,
      optionValue3: v.option3 ?? null,
      imageSourceUrl: v.image_id != null ? imageById.get(String(v.image_id)) ?? null : null,
      sourceVariantId: v.id != null ? String(v.id) : null,
      sourceRawJson: v,
      quantity: Number.isFinite(v.inventory_quantity) ? Math.max(0, v.inventory_quantity ?? 0) : 0,
      active: v.available !== false,
      sortOrder: i,
    };
  });

  const images: MappedImage[] = (shopify.images ?? [])
    .filter((img): img is ShopifyImage & { src: string } =>
      typeof img.src === "string" && img.src.startsWith("http"),
    )
    .map((img, i) => ({
      sourceUrl: img.src,
      alt: img.alt ?? `${modelName} — image ${i + 1}`,
      position: typeof img.position === "number" ? img.position : i + 1,
      shopifyImageId: img.id != null ? String(img.id) : null,
    }))
    .sort((a, b) => a.position - b.position);

  return {
    productPayload: {
      nameEn: modelName,
      nameAr: modelName,
      brand: shopify.vendor ?? "",
      sku,
      model: modelName,
      descEn: descPlain.slice(0, 8000),
      descAr: descPlain.slice(0, 8000),
      price: price ?? 0,
      oldPrice,
      warranty: finalWarranty,
      specs,
      quantity: variants.reduce((sum, v) => sum + (v.quantity || 0), 0) || 1,
      published: false,
      isNew: true,
      sourceUrl,
      sourceHandle: shopify.handle,
      sourcePrice: shopifyPrice,
      importedAt: new Date().toISOString(),
      importBatchId: opts.importBatchId ?? null,
    },
    images,
    variants,
    flags: {
      missingPrice: shopifyPrice == null,
      noImages: images.length === 0,
    },
    sourceMeta: {
      source,
      handle: shopify.handle,
      url: sourceUrl,
      product_type: shopify.product_type ?? null,
      vendor: shopify.vendor ?? null,
      title: modelName || null,
      tags: shopify.tags ?? [],
    },
  };
}

function parsePriceToInt(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const n = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function extractFlatSpecs(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const labelRe = /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*[:：-]?\s*([\s\S]*)/i;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html)) !== null) {
    const inner = m[1];
    const lm = labelRe.exec(inner);
    if (!lm) continue;
    const key = htmlToPlainText(lm[1]).trim();
    const val = htmlToPlainText(lm[2]).trim();
    if (key && val && key.length < 60 && val.length < 200) out[normalizeKey(key)] = val;
  }
  return out;
}

function normalizeKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "spec";
}

function cleanBodyHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
