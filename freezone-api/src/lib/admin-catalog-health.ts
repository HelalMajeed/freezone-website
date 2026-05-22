import type { PrismaClient } from "@prisma/client";
import {
  isLongMarketingFacetText,
  MAX_FACET_FILTER_TOKEN_LEN,
  sanitizeFacetFilterToken,
} from "./classification/facet-filter-token";
import { sanitizeStoredScreenSize } from "./classification/laptop-filter-extract";
import { resolveDisplaySpecKey } from "./classification/filter-display-link";
import { loadCategoryAttributeSchema } from "./classification/persist";
import { parseOptionsJson } from "./classification/values";
import { productAttributeValuesToFilterValues } from "./classification/values";
import type { CategoryAttributeRow, ProductAttributeValueRow } from "./classification/types";

export type CatalogHealthSummary = {
  productsMissingSpecs: number;
  productsMissingImages: number;
  productsInvalidFilters: number;
  productsLegacySpecsOnly: number;
  productsMissingBrand: number;
  categoriesWithoutAttributes: number;
};

export type DataQualityIssue = {
  productId: number;
  nameEn: string;
  nameAr: string;
  categorySlug: string;
  categoryName: string;
  published: boolean;
  issue: string;
  detail?: string;
  attributeKey?: string;
  suggestedFix?: string;
};

function suggestedFixForIssue(issue: string, detail?: string): string {
  if (issue === "missing_image") return "أضف صورة رئيسية من تبويب الوسائط في محرر المنتج.";
  if (issue === "missing_brand") return "حدّد العلامة التجارية في بيانات المنتج الأساسية.";
  if (issue === "legacy_specs_only") {
    return "أعد إدخال المواصفات من «المواصفات والفلاتر» (Smart Specs) أو استخدم أدوات التصنيف.";
  }
  if (issue === "no_attributes") {
    return "افتح القسم → إدارة الفلاتر والسمات وأكمل schema القسم (أو شغّل مزامنة السمات من API الإدارة).";
  }
  if (issue === "invalid_filter") {
    if (detail?.includes("marketing") || detail?.includes("chars")) {
      return "اختصر قيمة الفلتر وضع النص الكامل في مواصفة صفحة المنتج المرتبطة.";
    }
    if (detail?.includes("options") || detail?.includes("not in category")) {
      return "اختر قيمة من خيارات فلتر القسم أو أضف الخيار من إعدادات القسم.";
    }
    return "صحّح قيمة الفلتر في Smart Specs — رمز قصير في الفلتر والنص الكامل في مواصفة العرض.";
  }
    if (issue === "missing_specs") {
    if (detail?.includes("not in category schema")) {
      return "المنتج يحتوي مفاتيح مواصفات لا تطابق قسمه — راجع Smart Specs بعد تغيير القسم أو أعد إدخال القيم.";
    }
    if (detail?.includes("linked display")) {
      return "أكمل مواصفة صفحة المنتج (العمود الثالث) بجانب قيمة الفلتر المختصرة.";
    }
    if (detail?.includes("required filter")) {
      return "أكمل قيمة الفلتر المطلوبة من Smart Specs.";
    }
    if (detail?.includes("not in category options")) {
      return "هذه القيمة غير موجودة في خيارات فلتر القسم — غيّر القيمة أو أضف الخيار في إعدادات القسم.";
    }
    return "أكمل المواصفات والفلاتر من تبويب «المواصفات والفلاتر» في الوضع البسيط.";
  }
  return "راجع المنتج في المحرر.";
}

function isDisplaySpecKey(key: string): boolean {
  return key.endsWith("_full") || key.endsWith("_display");
}

export function invalidFilterReason(attributeKey: string, raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.length > MAX_FACET_FILTER_TOKEN_LEN) return `value exceeds ${MAX_FACET_FILTER_TOKEN_LEN} chars`;
  if (isLongMarketingFacetText(t)) return "marketing or display text in filter";
  const key = attributeKey.toLowerCase();
  if (key === "screen_size" || key === "size_inch") {
    if (!sanitizeStoredScreenSize(t)) return "screen size out of laptop range (10–20 inch)";
  }
  const sanitized = sanitizeFacetFilterToken(attributeKey, t);
  if (!sanitized) return "filter token failed sanitization";
  if (sanitized !== t && isLongMarketingFacetText(t)) return "filter not normalized";
  return null;
}

function rowToFilterValues(
  rows: ProductAttributeValueRow[],
  schema: CategoryAttributeRow[],
): Record<string, string> {
  return productAttributeValuesToFilterValues(rows, schema);
}

function rowsToDisplayMap(rows: ProductAttributeValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const d = r.displayValue?.trim();
    if (d) out[r.attributeKey] = d;
  }
  return out;
}

export async function computeCatalogHealthSummary(prisma: PrismaClient): Promise<CatalogHealthSummary> {
  const [productsMissingImages, categoriesWithoutAttributes] = await Promise.all([
    prisma.product.count({ where: { images: { none: {} } } }),
    prisma.category.count({
      where: { active: true, categoryAttributes: { none: {} } },
    }),
  ]);

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, nameEn: true },
  });
  const schemaByCategory = new Map<number, CategoryAttributeRow[]>();
  for (const cat of categories) {
    const schema = await loadCategoryAttributeSchema(
      (args) => prisma.categoryAttribute.findMany(args),
      cat.id,
    );
    schemaByCategory.set(cat.id, schema);
  }

  const products = await prisma.product.findMany({
    include: {
      category: { select: { slug: true } },
      attributeValues: true,
      _count: { select: { attributeValues: true } },
    },
  });

  let productsMissingSpecs = 0;
  let productsInvalidFilters = 0;
  let productsLegacySpecsOnly = 0;
  let productsMissingBrand = 0;

  for (const p of products) {
    if (!p.brand?.trim() && p.brandId == null) productsMissingBrand++;

    const schema = schemaByCategory.get(p.categoryId) ?? [];
    const values: ProductAttributeValueRow[] = p.attributeValues.map((v) => ({
      attributeKey: v.attributeKey,
      displayValue: v.displayValue,
      valueString: v.valueString,
      valueNumber: v.valueNumber,
      valueBoolean: v.valueBoolean,
      valueJson: v.valueJson,
    }));

    const legacy =
      p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
        ? Object.keys(p.specs as Record<string, unknown>).length > 0
        : false;

    if (p._count.attributeValues === 0 && legacy) {
      productsLegacySpecsOnly++;
    }

    if (schema.length > 0) {
      const filterable = schema.filter((a) => a.filterable);
      const filters = rowToFilterValues(values, schema);
      const display = rowsToDisplayMap(values);

      let missing = false;
      if (p._count.attributeValues === 0) {
        missing = true;
      } else {
        const hasGpuDisplay = Boolean(display.gpu_full?.trim() || display.gpu?.trim());
        const hasCpuDisplay = Boolean(display.processor_full?.trim() || display.processor?.trim());
        if (hasGpuDisplay && !filters.gpu_model && filterable.some((a) => a.key === "gpu_model")) {
          missing = true;
        }
        if (hasCpuDisplay && !filters.processor_family && filterable.some((a) => a.key === "processor_family")) {
          missing = true;
        }
      }
      if (missing) productsMissingSpecs++;

      let invalid = false;
      for (const attr of filterable) {
        const raw = values.find((v) => v.attributeKey === attr.key)?.valueString ?? filters[attr.key];
        if (invalidFilterReason(attr.key, raw)) {
          invalid = true;
          break;
        }
      }
      if (!invalid) {
        for (const [key, val] of Object.entries(filters)) {
          if (invalidFilterReason(key, val)) {
            invalid = true;
            break;
          }
        }
      }
      if (invalid) productsInvalidFilters++;
    }
  }

  return {
    productsMissingSpecs,
    productsMissingImages,
    productsInvalidFilters,
    productsLegacySpecsOnly,
    productsMissingBrand,
    categoriesWithoutAttributes,
  };
}

export async function listDataQualityIssues(
  prisma: PrismaClient,
  tab: string,
  page: number,
  limit: number,
): Promise<{ items: DataQualityIssue[]; total: number }> {
  const skip = (page - 1) * limit;
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, nameEn: true },
  });
  const schemaByCategory = new Map<number, CategoryAttributeRow[]>();
  for (const cat of categories) {
    schemaByCategory.set(
      cat.id,
      await loadCategoryAttributeSchema((args) => prisma.categoryAttribute.findMany(args), cat.id),
    );
  }

  if (tab === "categories_without_attributes") {
    const cats = categories.filter((c) => !(schemaByCategory.get(c.id)?.length ?? 0));
    const slice = cats.slice(skip, skip + limit);
    return {
      total: cats.length,
      items: slice.map((c) => ({
        productId: 0,
        nameEn: c.nameEn,
        nameAr: c.nameEn,
        categorySlug: c.slug,
        categoryName: c.nameEn,
        published: true,
        issue: "no_attributes",
        detail: "Category has no CategoryAttribute rows",
        suggestedFix: suggestedFixForIssue("no_attributes"),
      })),
    };
  }

  const products = await prisma.product.findMany({
    include: {
      category: { select: { slug: true, nameEn: true } },
      images: { select: { id: true }, take: 1 },
      attributeValues: true,
      _count: { select: { attributeValues: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const all: DataQualityIssue[] = [];

  for (const p of products) {
    const schema = schemaByCategory.get(p.categoryId) ?? [];
    const values: ProductAttributeValueRow[] = p.attributeValues.map((v) => ({
      attributeKey: v.attributeKey,
      displayValue: v.displayValue,
      valueString: v.valueString,
      valueNumber: v.valueNumber,
      valueBoolean: v.valueBoolean,
      valueJson: v.valueJson,
    }));
    const filters = rowToFilterValues(values, schema);
    const display = rowsToDisplayMap(values);

    if (tab === "missing_images" && p.images.length === 0) {
      all.push({
        productId: p.id,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        categorySlug: p.category.slug,
        categoryName: p.category.nameEn,
        published: p.published,
        issue: "missing_image",
        suggestedFix: suggestedFixForIssue("missing_image"),
      });
      continue;
    }

    if (tab === "missing_brand" && !p.brand?.trim() && p.brandId == null) {
      all.push({
        productId: p.id,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        categorySlug: p.category.slug,
        categoryName: p.category.nameEn,
        published: p.published,
        issue: "missing_brand",
        suggestedFix: suggestedFixForIssue("missing_brand"),
      });
      continue;
    }

    if (tab === "legacy_specs") {
      const legacy =
        p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
          ? Object.keys(p.specs as Record<string, unknown>).length > 0
          : false;
      if (legacy && p._count.attributeValues === 0) {
        all.push({
          productId: p.id,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          categorySlug: p.category.slug,
          categoryName: p.category.nameEn,
          published: p.published,
          issue: "legacy_specs_only",
          detail: "Product.specs JSON only — no ProductAttributeValue rows",
          suggestedFix: suggestedFixForIssue("legacy_specs_only"),
        });
      }
      continue;
    }

    if (tab === "missing_specs" && schema.length > 0) {
      let reason: string | null = null;
      if (p._count.attributeValues === 0) reason = "no attribute values";
      else {
        const schemaKeys = new Set(schema.map((a) => a.key));
        for (const v of values) {
          if (!schemaKeys.has(v.attributeKey)) {
            reason = `spec key not in category schema: ${v.attributeKey}`;
            break;
          }
        }
      }
      if (!reason && p._count.attributeValues > 0) {
        for (const attr of schema.filter((a) => a.filterable)) {
          const displayKey = resolveDisplaySpecKey(attr, p.category.slug);
          const filterVal = filters[attr.key]?.trim();
          const displayVal = displayKey ? display[displayKey]?.trim() : "";
          if (attr.required && !filterVal) {
            reason = `required filter missing: ${attr.key}`;
            break;
          }
          if (displayKey && (attr.displaySpecRequired || filterVal) && !displayVal) {
            reason = `linked display missing: ${displayKey} (filter ${attr.key})`;
            break;
          }
          if (filterVal && attr.options) {
            const opts = parseOptionsJson(attr.options);
            if (opts?.length && !opts.includes(filterVal)) {
              reason = `filter not in category options: ${attr.key}=${filterVal}`;
              break;
            }
          }
        }
        if (!reason && (display.gpu_full || display.gpu) && !filters.gpu_model) {
          reason = "gpu_model missing (gpu_full present)";
        }
        if (
          !reason &&
          (display.processor_full || display.processor) &&
          !filters.processor_family
        ) {
          reason = "processor_family missing (processor_full present)";
        }
      }
      if (reason) {
        const attrMatch = reason.match(/: ([a-z0-9_]+)(?:\s*=|$|\s)/);
        all.push({
          productId: p.id,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          categorySlug: p.category.slug,
          categoryName: p.category.nameEn,
          published: p.published,
          issue: "missing_specs",
          detail: reason,
          attributeKey: attrMatch?.[1],
          suggestedFix: suggestedFixForIssue("missing_specs", reason),
        });
      }
      continue;
    }

    if (tab === "invalid_filters") {
      for (const attr of schema.filter((a) => a.filterable)) {
        const raw = values.find((v) => v.attributeKey === attr.key)?.valueString ?? filters[attr.key];
        const filterVal = raw?.trim() ?? "";
        const opts = parseOptionsJson(attr.options);
        if (opts?.length && filterVal) {
          const parts =
            attr.type === "MULTI_SELECT"
              ? filterVal.split(",").map((s) => s.trim()).filter(Boolean)
              : [filterVal];
          const bad = parts.find((part) => !opts.includes(part));
          if (bad) {
            all.push({
              productId: p.id,
              nameEn: p.nameEn,
              nameAr: p.nameAr,
              categorySlug: p.category.slug,
              categoryName: p.category.nameEn,
              published: p.published,
              issue: "invalid_filter",
              attributeKey: attr.key,
              detail: `${attr.key}: not in category options (${bad})`,
              suggestedFix: suggestedFixForIssue("invalid_filter", "not in category options"),
            });
            break;
          }
        }
        const why = invalidFilterReason(attr.key, raw);
        if (why) {
          all.push({
            productId: p.id,
            nameEn: p.nameEn,
            nameAr: p.nameAr,
            categorySlug: p.category.slug,
            categoryName: p.category.nameEn,
            published: p.published,
            issue: "invalid_filter",
            attributeKey: attr.key,
            detail: `${attr.key}: ${why}${raw ? ` (“${raw.slice(0, 40)}${raw.length > 40 ? "…" : ""}”)` : ""}`,
            suggestedFix: suggestedFixForIssue("invalid_filter", why),
          });
          break;
        }
      }
      for (const [key, val] of Object.entries(filters)) {
        if (isDisplaySpecKey(key)) continue;
        const why = invalidFilterReason(key, val);
        if (why) {
          const exists = all.some((x) => x.productId === p.id && x.issue === "invalid_filter");
          if (!exists) {
            all.push({
              productId: p.id,
              nameEn: p.nameEn,
              nameAr: p.nameAr,
              categorySlug: p.category.slug,
              categoryName: p.category.nameEn,
              published: p.published,
              issue: "invalid_filter",
              attributeKey: key,
              detail: `${key}: ${why}`,
              suggestedFix: suggestedFixForIssue("invalid_filter", why),
            });
          }
          break;
        }
      }
    }
  }

  return {
    total: all.length,
    items: all.slice(skip, skip + limit),
  };
}

export async function getCategoryHealthRows(prisma: PrismaClient) {
  const categories = await prisma.category.findMany({
    where: { active: true },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      _count: { select: { products: true, categoryAttributes: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const rows = [];
  for (const cat of categories) {
    const schema = await loadCategoryAttributeSchema(
      (args) => prisma.categoryAttribute.findMany(args),
      cat.id,
    );
    const filterableCount = schema.filter((a) => a.filterable).length;
    const displayCount = schema.filter((a) => isDisplaySpecKey(a.key) || !a.filterable).length;

    const productIds = await prisma.product.findMany({
      where: { categoryId: cat.id },
      select: { id: true, attributeValues: { select: { id: true } } },
    });
    const missingSpecs = productIds.filter((p) => p.attributeValues.length === 0).length;

    rows.push({
      categoryId: cat.id,
      slug: cat.slug,
      name: cat.nameEn,
      productCount: cat._count.products,
      attributeCount: cat._count.categoryAttributes,
      filterableAttributes: filterableCount,
      displaySpecAttributes: displayCount,
      productsMissingSpecs: missingSpecs,
    });
  }
  return rows;
}
