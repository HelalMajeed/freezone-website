import type { PrismaClient } from "@prisma/client";
import { resolveDisplaySpecKey } from "./classification/filter-display-link";
import { loadCategoryAttributeSchema } from "./classification/persist";
import { parseOptionsJson } from "./classification/values";
import { productAttributeValuesToFilterValues } from "./classification/values";
import type { CategoryAttributeRow, ProductAttributeValueRow } from "./classification/types";
import { ACTIVE_PRODUCT_WHERE, mergeProductWhere } from "./admin-product-scope";
import {
  hasInvalidFilters,
  hasLegacySpecsOnly,
  invalidFilterReason,
  mapAttributeValues,
  missingSpecsReason,
  type ProductQualityInput,
} from "./admin-product-quality";

export { invalidFilterReason } from "./admin-product-quality";

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

function toQualityInput(
  p: {
    brand: string;
    brandId: number | null;
    categoryId: number;
    specs: unknown;
    category: { slug: string };
    attributeValues: {
      attributeKey: string;
      displayValue: string | null;
      valueString: string | null;
      valueNumber: number | null;
      valueBoolean: boolean | null;
      valueJson: unknown;
    }[];
    _count: { attributeValues: number };
  },
): ProductQualityInput {
  const attributeValues = mapAttributeValues(p.attributeValues);
  return {
    brand: p.brand,
    brandId: p.brandId,
    categoryId: p.categoryId,
    categorySlug: p.category.slug,
    specs: p.specs,
    attributeValues,
    attributeValueCount: p._count.attributeValues,
  };
}

export async function computeCatalogHealthSummary(prisma: PrismaClient): Promise<CatalogHealthSummary> {
  const [productsMissingImages, categoriesWithoutAttributes] = await Promise.all([
    prisma.product.count({
      where: mergeProductWhere(ACTIVE_PRODUCT_WHERE, { images: { none: {} } }),
    }),
    prisma.category.count({
      where: { active: true, categoryAttributes: { none: {} } },
    }),
  ]);

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

  const products = await prisma.product.findMany({
    where: ACTIVE_PRODUCT_WHERE,
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
    const q = toQualityInput(p);
    if (!q.brand?.trim() && q.brandId == null) productsMissingBrand++;
    if (hasLegacySpecsOnly(q)) productsLegacySpecsOnly++;

    const schema = schemaByCategory.get(p.categoryId) ?? [];
    if (schema.length > 0) {
      if (missingSpecsReason(q, schema)) productsMissingSpecs++;
      if (hasInvalidFilters(q, schema)) productsInvalidFilters++;
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
    where: ACTIVE_PRODUCT_WHERE,
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
      if (hasLegacySpecsOnly(toQualityInput(p))) {
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
      const reason = missingSpecsReason(toQualityInput(p), schema);
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
      _count: { select: { categoryAttributes: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const schemaByCategory = new Map<number, CategoryAttributeRow[]>();
  for (const cat of categories) {
    schemaByCategory.set(
      cat.id,
      await loadCategoryAttributeSchema((args) => prisma.categoryAttribute.findMany(args), cat.id),
    );
  }

  const activeProducts = await prisma.product.findMany({
    where: ACTIVE_PRODUCT_WHERE,
    include: {
      category: { select: { slug: true } },
      attributeValues: true,
      _count: { select: { attributeValues: true } },
    },
  });

  const missingByCategory = new Map<number, number>();
  const countByCategory = new Map<number, number>();
  for (const p of activeProducts) {
    countByCategory.set(p.categoryId, (countByCategory.get(p.categoryId) ?? 0) + 1);
    const schema = schemaByCategory.get(p.categoryId) ?? [];
    if (schema.length > 0 && missingSpecsReason(toQualityInput(p), schema)) {
      missingByCategory.set(p.categoryId, (missingByCategory.get(p.categoryId) ?? 0) + 1);
    }
  }

  const rows = [];
  for (const cat of categories) {
    const schema = schemaByCategory.get(cat.id) ?? [];
    const filterableCount = schema.filter((a) => a.filterable).length;
    const displayCount = schema.filter((a) => isDisplaySpecKey(a.key) || !a.filterable).length;
    const productCount = countByCategory.get(cat.id) ?? 0;
    const productsMissingSpecs = missingByCategory.get(cat.id) ?? 0;
    const status: "healthy" | "warning" | "empty" =
      productCount === 0
        ? "empty"
        : productsMissingSpecs > 0 || cat._count.categoryAttributes === 0
          ? "warning"
          : "healthy";

    rows.push({
      categoryId: cat.id,
      slug: cat.slug,
      name: cat.nameEn,
      productCount,
      attributeCount: cat._count.categoryAttributes,
      filterableAttributes: filterableCount,
      displaySpecAttributes: displayCount,
      productsMissingSpecs,
      status,
    });
  }
  return rows;
}
