import type { Product, Category, Brand, FacetAttributeDef } from "./data";
import { PRODUCTS, CATEGORIES, BRANDS } from "./data";
import { prisma, isDatabaseConfigured, isDbConnectionError } from "./prisma";
import { productQueryMissingSecondarySupport } from "./prisma-product-secondary-fallback";
import { facetKeysFromAttributes, parseFacetAttributesFromUnknown } from "./facet-attributes";
import { getCategoryFilterSchema } from "./classification/category-filter-schema";
import { categoryAttributeRowsToFacetDefs } from "./classification/sync";
import {
  productAttributeValuesToDisplaySpecs,
  productAttributeValuesToFilterValues,
} from "./classification/values";
import type { CategoryAttributeRow, ProductAttributeValueRow } from "./classification/types";

export type LocaleCode = "en" | "ar";

export function mapDbToProduct(
  row: {
    id: number;
    brand: string;
    brandRef: { nameEn: string; nameAr: string } | null;
    nameEn: string;
    nameAr: string;
    descEn: string;
    descAr: string;
    price: number;
    oldPrice: number | null;
    storage: string;
    specs: unknown;
    attributeValues?: ProductAttributeValueRow[];
    categoryAttributes?: CategoryAttributeRow[];
    inStock: boolean;
    featured: boolean;
    isNew: boolean;
    icon: string;
    rating: number;
    reviews: number;
    sales: number;
    model3d: string | null;
    sku: string;
    model?: string;
    warranty?: string | null;
    createdAt: Date;
    category: { slug: string; categoryAttributes?: CategoryAttributeRow[] };
    images: { url: string; sortOrder: number }[];
    secondaryCategories?: { category: { slug: string } }[];
  },
  locale: LocaleCode,
): Product {
  const imgs = [...row.images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.url);
  const extraSlugs =
    row.secondaryCategories?.map((l) => l.category.slug).filter((s) => s && s !== row.category.slug) ?? [];
  const brandName = row.brandRef
    ? locale === "ar"
      ? row.brandRef.nameAr
      : row.brandRef.nameEn
    : row.brand;
  const specMaps = resolveProductSpecMaps(row);
  return {
    id: row.id,
    cat: row.category.slug,
    ...(extraSlugs.length ? { extraCats: extraSlugs } : {}),
    brand: brandName,
    name: locale === "ar" ? row.nameAr : row.nameEn,
    desc: locale === "ar" ? row.descAr : row.descEn,
    price: row.price,
    oldPrice: row.oldPrice,
    storage: row.storage,
    inStock: row.inStock,
    featured: row.featured,
    isNew: row.isNew,
    date: row.createdAt.toISOString().split("T")[0],
    icon: row.icon,
    rating: row.rating,
    reviews: row.reviews,
    sales: row.sales,
    images: imgs,
    model3d: row.model3d,
    sku: row.sku?.trim() || undefined,
    model: row.model?.trim() || undefined,
    warranty: row.warranty?.trim() || undefined,
    specs: specMaps.display,
    ...(Object.keys(specMaps.filterValues).length ? { filterValues: specMaps.filterValues } : {}),
  };
}

function resolveProductSpecMaps(row: {
  specs: unknown;
  attributeValues?: ProductAttributeValueRow[];
  category?: { categoryAttributes?: CategoryAttributeRow[] };
}): { display: Record<string, string> | undefined; filterValues: Record<string, string> } {
  const schema = row.category?.categoryAttributes ?? [];
  if (row.attributeValues?.length && schema.length) {
    const display = productAttributeValuesToDisplaySpecs(row.attributeValues, schema);
    const filterValues = productAttributeValuesToFilterValues(row.attributeValues, schema);
    return {
      display: Object.keys(display).length ? display : undefined,
      filterValues,
    };
  }
  if (row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)) {
    return { display: row.specs as Record<string, string>, filterValues: {} };
  }
  return { display: undefined, filterValues: {} };
}

function mapDbToCategory(
  row: {
    slug: string;
    nameEn: string;
    nameAr: string;
    icon: string;
    color: string;
    facetKeys: unknown;
    categoryAttributes?: CategoryAttributeRow[];
    backgroundImageUrl: string | null;
  },
  locale: LocaleCode,
): Category {
  const presetFilterAttrs = getCategoryFilterSchema(row.slug).filter((a) => a.filterable === true);
  const facetAttributes: FacetAttributeDef[] = row.categoryAttributes?.length
    ? categoryAttributeRowsToFacetDefs(
        row.categoryAttributes.filter((a) => a.filterable === true && a.active !== false),
      )
    : presetFilterAttrs.length > 0
      ? presetFilterAttrs
      : parseFacetAttributesFromUnknown(row.facetKeys);
  const facetKeys = facetAttributes.length ? facetKeysFromAttributes(facetAttributes) : undefined;
  const img = row.backgroundImageUrl?.trim() || null;
  return {
    id: row.slug,
    name: locale === "ar" ? row.nameAr : row.nameEn,
    icon: row.icon,
    color: row.color,
    img,
    ...(facetAttributes.length ? { facetAttributes, facetKeys } : {}),
  };
}

export const storefrontProductIncludeBase = {
  category: {
    select: {
      slug: true,
      categoryAttributes: { where: { active: true }, orderBy: { sortOrder: "asc" as const } },
    },
  },
  attributeValues: true,
  images: { select: { url: true, sortOrder: true } },
  brandRef: { select: { nameEn: true, nameAr: true } },
} as const;

const storefrontProductIncludeLegacy = {
  category: { select: { slug: true } },
  images: { select: { url: true, sortOrder: true } },
  brandRef: { select: { nameEn: true, nameAr: true } },
} as const;

function catalogQueryMissingClassificationSupport(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /CategoryAttribute|ProductAttributeValue|categoryAttributes|attributeValues/i.test(msg);
}

export async function getProductsCatalog(locale: LocaleCode): Promise<Product[]> {
  if (!isDatabaseConfigured()) {
    return PRODUCTS;
  }
  try {
    let rows;
    try {
      rows = await prisma.product.findMany({
        where: { published: true },
        include: {
          ...storefrontProductIncludeBase,
          secondaryCategories: { include: { category: { select: { slug: true } } } },
        },
        orderBy: { id: "asc" },
      });
    } catch (e) {
      if (catalogQueryMissingClassificationSupport(e)) {
        console.warn("[catalog] loading products without classification tables (run migrate).");
        rows = await prisma.product.findMany({
          where: { published: true },
          include: { ...storefrontProductIncludeLegacy },
          orderBy: { id: "asc" },
        });
      } else if (!productQueryMissingSecondarySupport(e)) {
        throw e;
      } else {
        console.warn("[catalog] loading products without secondaryCategories.");
        rows = await prisma.product.findMany({
          where: { published: true },
          include: { ...storefrontProductIncludeLegacy },
          orderBy: { id: "asc" },
        });
      }
    }
    return rows.map((r) => mapDbToProduct(r, locale));
  } catch (e) {
    if (!isDbConnectionError(e)) console.error("[catalog] DB products fallback:", e);
    return PRODUCTS;
  }
}

export async function getCategoriesCatalog(locale: LocaleCode): Promise<Category[]> {
  if (!isDatabaseConfigured()) {
    return CATEGORIES;
  }
  try {
    let rows;
    try {
      rows = await prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: { categoryAttributes: { orderBy: { sortOrder: "asc" } } },
      });
    } catch (e) {
      if (!catalogQueryMissingClassificationSupport(e)) throw e;
      rows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
    }
    return rows.map((r) =>
      mapDbToCategory(
        {
          slug: r.slug,
          nameEn: r.nameEn,
          nameAr: r.nameAr,
          icon: r.icon,
          color: r.color,
          facetKeys: r.facetKeys,
          categoryAttributes: "categoryAttributes" in r ? (r as { categoryAttributes: CategoryAttributeRow[] }).categoryAttributes : undefined,
          backgroundImageUrl: r.backgroundImageUrl,
        },
        locale,
      ),
    );
  } catch (e) {
    if (!isDbConnectionError(e)) console.error("[catalog] DB categories fallback:", e);
    return CATEGORIES;
  }
}

export async function getBrandsCatalog(locale: LocaleCode): Promise<Brand[]> {
  if (!isDatabaseConfigured()) {
    return BRANDS;
  }
  try {
    const rows = await prisma.brand.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    if (rows.length === 0) {
      return BRANDS;
    }
    return rows.map((r) => {
      const name = locale === "ar" ? r.nameAr : r.nameEn;
      const slugClean = r.slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
      const logo = r.logoUrl?.trim();
      const img =
        (logo && !/^\/brands\/b\d+-/i.test(logo) ? logo : null) ||
        (slugClean.length >= 2 ? `/brands/${slugClean}.svg` : null);
      return { name, img };
    });
  } catch (e) {
    if (!isDbConnectionError(e)) console.error("[catalog] DB brands fallback:", e);
    return BRANDS;
  }
}

export async function getProductById(id: number, locale: LocaleCode): Promise<Product | null> {
  if (!isDatabaseConfigured()) {
    return PRODUCTS.find((p) => p.id === id) ?? null;
  }
  try {
    let row;
    try {
      row = await prisma.product.findFirst({
        where: { id, published: true },
        include: {
          ...storefrontProductIncludeBase,
          secondaryCategories: { include: { category: { select: { slug: true } } } },
        },
      });
    } catch (e) {
      if (!productQueryMissingSecondarySupport(e)) throw e;
      row = await prisma.product.findFirst({
        where: { id, published: true },
        include: { ...storefrontProductIncludeBase },
      });
    }
    return row ? mapDbToProduct(row, locale) : null;
  } catch {
    return PRODUCTS.find((p) => p.id === id) ?? null;
  }
}
