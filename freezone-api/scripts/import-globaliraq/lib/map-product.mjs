// Map a Shopify product JSON (from /products/<handle>.json) onto the payload
// the FreeZone admin API expects (POST /api/admin/products).
//
// Reads the user-given business rules:
//   - oldPrice  ⇐ Shopify variant price (unchanged, IQD integer)
//   - price     ⇐ oldPrice × markup (default 1.35), rounded to nearest integer
//   - warranty  ⇐ "ضمان سنتين وكالة" (stored as a spec entry — schema has no warranty column)
//   - sourceUrl / sourceHandle / sourcePrice / importedAt / importBatchId all set.
//
// `specs` JSON gets the warranty + any flat key/value the Shopify body_html exposes
// via simple <ul><li><strong>Key:</strong> Value</li></ul> blocks. Anything richer
// is left in `descAr` / `descEn` for an admin to format.

export const DEFAULT_MARKUP = 1.35;
export const DEFAULT_WARRANTY_AR = "ضمان سنتين وكالة";

/**
 * Build the request body to POST /api/admin/products plus a side-car
 * `images` array of {sourceUrl, alt} entries — the importer feeds those to
 * /api/admin/media/import-image one-by-one (so SSRF + sharp validation run).
 */
export function shopifyToFreezone(shopify, { source = "globaliraq", baseUrl, importBatchId, markup = DEFAULT_MARKUP, warrantyAr = DEFAULT_WARRANTY_AR } = {}) {
  const sourceUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/products/${shopify.handle}` : null;

  const firstVariant = (shopify.variants && shopify.variants[0]) || null;
  const shopifyPrice = firstVariant ? parsePriceToInt(firstVariant.price) : null;
  /** Mark unparseable prices clearly — we never want to silently store 0 IQD. */
  const oldPrice = shopifyPrice;
  const price = shopifyPrice != null ? Math.round(shopifyPrice * markup) : null;

  const sku = (firstVariant && (firstVariant.sku || "").trim()) || "";
  const modelName = (shopify.title || "").trim();

  /** Body has the bulk of the merchant copy. Strip <script>/<style> + collapse whitespace. */
  const descHtml = cleanBodyHtml(shopify.body_html || "");
  const descPlain = htmlToPlainText(descHtml);

  const specs = extractFlatSpecs(shopify.body_html || "");
  specs.warranty = warrantyAr;
  if (shopify.vendor) specs.brandSource = shopify.vendor;

  const variants = (shopify.variants || []).map((v) => ({
    sku: (v.sku || "").trim(),
    labelEn: (v.title || v.option1 || "").trim(),
    labelAr: (v.title || v.option1 || "").trim(),
    priceOverride: parsePriceToInt(v.price),
    quantity: Number.isFinite(v.inventory_quantity) ? Math.max(0, v.inventory_quantity) : 0,
    active: v.available !== false,
  }));

  const images = (shopify.images || [])
    .filter((img) => typeof img.src === "string" && img.src.startsWith("http"))
    .map((img, i) => ({
      sourceUrl: img.src,
      alt: img.alt || `${modelName} — image ${i + 1}`,
      position: typeof img.position === "number" ? img.position : i + 1,
    }))
    .sort((a, b) => a.position - b.position);

  return {
    /** Body sent to POST /api/admin/products. categoryId/brandId are resolved by the importer. */
    productPayload: {
      nameEn: modelName,
      nameAr: modelName,
      brand: shopify.vendor || "",
      sku,
      model: modelName,
      descEn: descPlain.slice(0, 8000),
      descAr: descPlain.slice(0, 8000),
      price: price ?? 0,
      oldPrice: oldPrice ?? undefined,
      specs,
      quantity: variants.reduce((sum, v) => sum + (v.quantity || 0), 0) || 1,
      published: false,
      isNew: true,
      sourceUrl,
      sourceHandle: shopify.handle,
      sourcePrice: shopifyPrice,
      importedAt: new Date().toISOString(),
      importBatchId: importBatchId || null,
    },
    images,
    variants,
    /** Surfaced so the importer can refuse to create rows we'd persist with bad data. */
    flags: {
      missingPrice: shopifyPrice == null,
      noImages: images.length === 0,
    },
    sourceMeta: {
      source,
      handle: shopify.handle,
      url: sourceUrl,
      product_type: shopify.product_type || null,
      tags: shopify.tags || [],
    },
  };
}

/** Shopify prices are decimal strings ("35000.00"); FreeZone stores IQD as Int. */
function parsePriceToInt(raw) {
  if (raw == null) return null;
  const n = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/** Pull out simple <li><strong>Key:</strong> Value</li> pairs as a flat record. */
function extractFlatSpecs(html) {
  const out = {};
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const labelRe = /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*[:：-]?\s*([\s\S]*)/i;
  let m;
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

function normalizeKey(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "spec";
}

function cleanBodyHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function htmlToPlainText(html) {
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
