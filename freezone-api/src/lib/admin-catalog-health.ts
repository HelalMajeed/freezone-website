import type { PrismaClient } from "@prisma/client";
import {
  isLongMarketingFacetText,
  MAX_FACET_FILTER_TOKEN_LEN,
  sanitizeFacetFilterToken,
} from "./classification/facet-filter-token";
import { sanitizeStoredScreenSize } from "./classification/laptop-filter-extract";
import { loadCategoryAttributeSchema } from "./classification/persist";
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
};

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
        });
      }
      continue;
    }

    if (tab === "missing_specs" && schema.length > 0) {
      let reason: string | null = null;
      if (p._count.attributeValues === 0) reason = "no attribute values";
      else if (
        (display.gpu_full || display.gpu) &&
        !filters.gpu_model &&
        schema.some((a) => a.key === "gpu_model" && a.filterable)
      ) {
        reason = "gpu_model missing (gpu_full present)";
      } else if (
        (display.processor_full || display.processor) &&
        !filters.processor_family &&
        schema.some((a) => a.key === "processor_family" && a.filterable)
      ) {
        reason = "processor_family missing (processor_full present)";
      }
      if (reason) {
        all.push({
          productId: p.id,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          categorySlug: p.category.slug,
          categoryName: p.category.nameEn,
          published: p.published,
          issue: "missing_specs",
          detail: reason,
        });
      }
      continue;
    }

    if (tab === "invalid_filters") {
      for (const attr of schema.filter((a) => a.filterable)) {
        const raw = values.find((v) => v.attributeKey === attr.key)?.valueString ?? filters[attr.key];
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
            detail: `${attr.key}: ${why}${raw ? ` (“${raw.slice(0, 40)}${raw.length > 40 ? "…" : ""}”)` : ""}`,
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
              detail: `${key}: ${why}`,
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
