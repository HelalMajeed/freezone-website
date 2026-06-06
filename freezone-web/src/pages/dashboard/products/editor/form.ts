/**
 * Product editor form model — string-backed inputs ↔ typed API payloads.
 */
import type { CategoryAttributeDef, ProductCatalogStatus } from "@/lib/dashboard/api";
import type {
  ProductAvailability,
  ProductEditorDetail,
  ProductEditorPatch,
  ProductImageWrite,
  SpecsPayload,
} from "@/lib/dashboard/api-extra";
import type { DashboardMessageKey } from "@/lib/dashboard/i18n";

export type EditorImage = {
  /** Stable client key for drag & drop. */
  key: string;
  url: string;
  altTextEn: string;
  altTextAr: string;
  originalSourceUrl: string | null;
};

export type EditorForm = {
  // Basic
  nameEn: string;
  nameAr: string;
  categoryId: string;
  brandId: string;
  published: boolean;
  featured: boolean;
  isNew: boolean;
  // Pricing
  price: string;
  oldPrice: string;
  salePrice: string;
  saleStartAt: string; // datetime-local value
  saleEndAt: string;
  costPrice: string;
  priceUsd: string;
  // Inventory
  quantity: string;
  lowStockThreshold: string;
  availability: ProductAvailability;
  sku: string;
  model: string;
  // Specs
  filterValues: Record<string, string>;
  displayValues: Record<string, string>;
  extraSpecs: Array<{ key: string; value: string }>;
  specsJsonMode: boolean;
  specsJson: string;
  // Images
  images: EditorImage[];
  // Content
  shortDescEn: string;
  shortDescAr: string;
  descEn: string;
  descAr: string;
  keyFeatures: string;
  whatsInBox: string;
  warranty: string;
  // SEO
  metaTitleEn: string;
  metaTitleAr: string;
  metaDescEn: string;
  metaDescAr: string;
  seoKeywords: string;
  slug: string;
  // Shipping
  weightKg: string;
  dimLengthCm: string;
  dimWidthCm: string;
  dimHeightCm: string;
  requiresSpecialHandling: boolean;
  excludedProvinces: string;
  // Advanced
  internalNotes: string;
  secondaryCategoryIds: number[];
  model3d: string;
  catalogStatus: ProductCatalogStatus;
};

export type EditorTabKey =
  | "basic"
  | "pricing"
  | "inventory"
  | "specs"
  | "variants"
  | "images"
  | "content"
  | "seo"
  | "shipping"
  | "advanced";

export type FieldErrors = Partial<Record<string, string>>;

/** Which tab each validated field lives on (used for error badges + focus). */
export const FIELD_TAB: Record<string, EditorTabKey> = {
  nameEn: "basic",
  categoryId: "basic",
  price: "pricing",
  oldPrice: "pricing",
  salePrice: "pricing",
  saleEndAt: "pricing",
  costPrice: "pricing",
  priceUsd: "pricing",
  quantity: "inventory",
  lowStockThreshold: "inventory",
  specsJson: "specs",
  weightKg: "shipping",
  dimLengthCm: "shipping",
  dimWidthCm: "shipping",
  dimHeightCm: "shipping",
};

let imageKeySeq = 0;
export function nextImageKey(): string {
  imageKeySeq += 1;
  return `img-${Date.now()}-${imageKeySeq}`;
}

export const EMPTY_FORM: EditorForm = {
  nameEn: "",
  nameAr: "",
  categoryId: "",
  brandId: "",
  published: false,
  featured: false,
  isNew: false,
  price: "",
  oldPrice: "",
  salePrice: "",
  saleStartAt: "",
  saleEndAt: "",
  costPrice: "",
  priceUsd: "",
  quantity: "0",
  lowStockThreshold: "5",
  availability: "IN_STOCK",
  sku: "",
  model: "",
  filterValues: {},
  displayValues: {},
  extraSpecs: [],
  specsJsonMode: false,
  specsJson: "",
  images: [],
  shortDescEn: "",
  shortDescAr: "",
  descEn: "",
  descAr: "",
  keyFeatures: "",
  whatsInBox: "",
  warranty: "",
  metaTitleEn: "",
  metaTitleAr: "",
  metaDescEn: "",
  metaDescAr: "",
  seoKeywords: "",
  slug: "",
  weightKg: "",
  dimLengthCm: "",
  dimWidthCm: "",
  dimHeightCm: "",
  requiresSpecialHandling: false,
  excludedProvinces: "",
  internalNotes: "",
  secondaryCategoryIds: [],
  model3d: "",
  catalogStatus: "DRAFT",
};

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function numStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

function lines(arr: string[] | null | undefined): string {
  return (arr ?? []).join("\n");
}

/** The schema keys "covered" by the structured spec editors. */
export function coveredSpecKeys(attributes: CategoryAttributeDef[]): Set<string> {
  const covered = new Set<string>();
  for (const attr of attributes) {
    covered.add(attr.key);
    if (attr.displaySpecKey) covered.add(attr.displaySpecKey);
  }
  return covered;
}

export function detailToForm(p: ProductEditorDetail): EditorForm {
  const covered = coveredSpecKeys(p.categoryAttributes ?? []);
  const extraSpecs = Object.entries(p.displaySpecs ?? {})
    .filter(([k]) => !covered.has(k))
    .map(([key, value]) => ({ key, value }));

  return {
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    categoryId: String(p.categoryId),
    brandId: p.brandId != null ? String(p.brandId) : "",
    published: p.published,
    featured: p.featured,
    isNew: p.isNew,
    price: String(p.price),
    oldPrice: numStr(p.oldPrice),
    salePrice: numStr(p.salePrice),
    saleStartAt: isoToLocalInput(p.saleStartAt),
    saleEndAt: isoToLocalInput(p.saleEndAt),
    costPrice: numStr(p.costPrice),
    priceUsd: numStr(p.priceUsd),
    quantity: String(p.quantity),
    lowStockThreshold: String(p.lowStockThreshold ?? 5),
    availability: p.availability ?? "IN_STOCK",
    sku: p.sku === "—" ? "" : p.sku,
    model: p.model,
    filterValues: { ...(p.filterSpecs ?? {}) },
    displayValues: { ...(p.displaySpecs ?? {}) },
    extraSpecs,
    specsJsonMode: false,
    specsJson: "",
    images: (p.images ?? []).map((img) => ({
      key: nextImageKey(),
      url: img.url,
      altTextEn: img.altTextEn ?? "",
      altTextAr: img.altTextAr ?? "",
      originalSourceUrl:
        (img as { originalSourceUrl?: string | null }).originalSourceUrl ?? null,
    })),
    shortDescEn: p.shortDescEn ?? "",
    shortDescAr: p.shortDescAr ?? "",
    descEn: p.descEn ?? "",
    descAr: p.descAr ?? "",
    keyFeatures: lines(p.keyFeatures),
    whatsInBox: lines(p.whatsInBox),
    warranty: p.warranty ?? "",
    metaTitleEn: p.metaTitleEn ?? "",
    metaTitleAr: p.metaTitleAr ?? "",
    metaDescEn: p.metaDescEn ?? "",
    metaDescAr: p.metaDescAr ?? "",
    seoKeywords: (p.seoKeywords ?? []).join(", "),
    slug: p.slug ?? "",
    weightKg: numStr(p.weightKg),
    dimLengthCm: numStr(p.dimLengthCm),
    dimWidthCm: numStr(p.dimWidthCm),
    dimHeightCm: numStr(p.dimHeightCm),
    requiresSpecialHandling: p.requiresSpecialHandling ?? false,
    excludedProvinces: lines(p.excludedProvinces),
    internalNotes: p.internalNotes ?? "",
    secondaryCategoryIds: (p.secondaryCategories ?? []).map((s) => s.categoryId),
    model3d: p.model3d ?? "",
    catalogStatus: p.catalogStatus,
  };
}

/** Compose the `specs` payload from the structured editors. */
export function buildSpecsPayload(
  form: EditorForm,
  attributes: CategoryAttributeDef[],
): SpecsPayload {
  const out: SpecsPayload = {};
  for (const attr of attributes) {
    if (attr.filterable) {
      const filter = (form.filterValues[attr.key] ?? "").trim();
      const displayKey = attr.displaySpecKey || null;
      if (displayKey) {
        const linked = (form.displayValues[displayKey] ?? "").trim();
        if (filter) out[attr.key] = { display: "", filter };
        if (linked) out[displayKey] = linked;
      } else {
        const inline = (form.displayValues[attr.key] ?? "").trim();
        if (filter) out[attr.key] = { display: inline, filter };
        else if (inline) out[attr.key] = inline;
      }
    } else {
      const display = (form.displayValues[attr.key] ?? "").trim();
      if (display) out[attr.key] = display;
    }
  }
  for (const row of form.extraSpecs) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (key && value && out[key] === undefined) out[key] = value;
  }
  return out;
}

/** Resolve the specs payload (JSON mode wins). Returns null on invalid JSON. */
export function resolveSpecsPayload(
  form: EditorForm,
  attributes: CategoryAttributeDef[],
): { ok: true; specs: SpecsPayload } | { ok: false } {
  if (!form.specsJsonMode) return { ok: true, specs: buildSpecsPayload(form, attributes) };
  try {
    const parsed: unknown = JSON.parse(form.specsJson || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false };
    return { ok: true, specs: parsed as SpecsPayload };
  } catch {
    return { ok: false };
  }
}

type TranslateFn = (key: DashboardMessageKey, vars?: Record<string, string | number>) => string;

const intRe = /^\d+$/;
const floatRe = /^\d+(\.\d+)?$/;

function checkOptionalInt(value: string, field: string, errors: FieldErrors, t: TranslateFn) {
  if (value.trim() && !intRe.test(value.trim())) {
    errors[field] = t("editor.errIntegerInvalid");
  }
}

function checkOptionalFloat(value: string, field: string, errors: FieldErrors, t: TranslateFn) {
  if (value.trim() && !floatRe.test(value.trim())) {
    errors[field] = t("editor.errNumberInvalid");
  }
}

export function validateForm(
  form: EditorForm,
  attributes: CategoryAttributeDef[],
  t: TranslateFn,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.nameEn.trim()) errors.nameEn = t("editor.errNameRequired");
  if (!form.categoryId || !intRe.test(form.categoryId)) {
    errors.categoryId = t("editor.errCategoryRequired");
  }
  if (!intRe.test(form.price.trim())) errors.price = t("editor.errPriceInvalid");
  checkOptionalInt(form.oldPrice, "oldPrice", errors, t);
  checkOptionalInt(form.salePrice, "salePrice", errors, t);
  checkOptionalInt(form.costPrice, "costPrice", errors, t);
  checkOptionalFloat(form.priceUsd, "priceUsd", errors, t);
  checkOptionalInt(form.quantity, "quantity", errors, t);
  checkOptionalInt(form.lowStockThreshold, "lowStockThreshold", errors, t);
  checkOptionalFloat(form.weightKg, "weightKg", errors, t);
  checkOptionalFloat(form.dimLengthCm, "dimLengthCm", errors, t);
  checkOptionalFloat(form.dimWidthCm, "dimWidthCm", errors, t);
  checkOptionalFloat(form.dimHeightCm, "dimHeightCm", errors, t);

  const start = localInputToIso(form.saleStartAt);
  const end = localInputToIso(form.saleEndAt);
  if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
    errors.saleEndAt = t("editor.errSaleWindow");
  }

  if (resolveSpecsPayload(form, attributes).ok === false) {
    errors.specsJson = t("editor.errSpecsJson");
  }
  return errors;
}

function splitLines(value: string, max: number): string[] {
  return value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function optInt(value: string): number | null {
  const v = value.trim();
  return v && intRe.test(v) ? parseInt(v, 10) : null;
}

function optFloat(value: string): number | null {
  const v = value.trim();
  return v && floatRe.test(v) ? Number(v) : null;
}

/** Build the PATCH body. Assumes `validateForm` returned no errors. */
export function buildPatch(
  form: EditorForm,
  attributes: CategoryAttributeDef[],
  brandLabel: string,
): ProductEditorPatch {
  const specs = resolveSpecsPayload(form, attributes);
  return {
    categoryId: parseInt(form.categoryId, 10),
    nameEn: form.nameEn.trim(),
    nameAr: form.nameAr.trim() || form.nameEn.trim(),
    brandId: form.brandId ? parseInt(form.brandId, 10) : null,
    brand: brandLabel,
    sku: form.sku.trim() || "—",
    model: form.model.trim(),
    slug: form.slug.trim() || null,
    published: form.published,
    featured: form.featured,
    isNew: form.isNew,
    catalogStatus: form.catalogStatus,
    price: parseInt(form.price.trim(), 10),
    oldPrice: optInt(form.oldPrice),
    salePrice: optInt(form.salePrice),
    saleStartAt: localInputToIso(form.saleStartAt),
    saleEndAt: localInputToIso(form.saleEndAt),
    costPrice: optInt(form.costPrice),
    priceUsd: optFloat(form.priceUsd),
    quantity: optInt(form.quantity) ?? 0,
    lowStockThreshold: optInt(form.lowStockThreshold) ?? 5,
    availability: form.availability,
    shortDescEn: form.shortDescEn.slice(0, 200),
    shortDescAr: form.shortDescAr.slice(0, 200),
    descEn: form.descEn,
    descAr: form.descAr,
    keyFeatures: splitLines(form.keyFeatures, 30),
    whatsInBox: splitLines(form.whatsInBox, 30),
    warranty: form.warranty.trim(),
    metaTitleEn: form.metaTitleEn.trim().slice(0, 70) || null,
    metaTitleAr: form.metaTitleAr.trim().slice(0, 70) || null,
    metaDescEn: form.metaDescEn.trim().slice(0, 170) || null,
    metaDescAr: form.metaDescAr.trim().slice(0, 170) || null,
    seoKeywords: form.seoKeywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30),
    weightKg: optFloat(form.weightKg),
    dimLengthCm: optFloat(form.dimLengthCm),
    dimWidthCm: optFloat(form.dimWidthCm),
    dimHeightCm: optFloat(form.dimHeightCm),
    requiresSpecialHandling: form.requiresSpecialHandling,
    excludedProvinces: splitLines(form.excludedProvinces, 50),
    internalNotes: form.internalNotes.trim() || null,
    model3d: form.model3d.trim() || null,
    secondaryCategoryIds: form.secondaryCategoryIds,
    specs: specs.ok ? specs.specs : undefined,
  };
}

export function imagesToWritePayload(images: EditorImage[]): ProductImageWrite[] {
  return images.map((img) => ({
    url: img.url,
    altTextEn: img.altTextEn.trim() || null,
    altTextAr: img.altTextAr.trim() || null,
    originalSourceUrl: img.originalSourceUrl,
  }));
}

/** Serializable snapshot used for the dirty check. */
export function formSnapshot(form: EditorForm): string {
  return JSON.stringify(form);
}
