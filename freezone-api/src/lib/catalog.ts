import type { Product, Category, Brand, FacetAttributeDef } from "./data";
import { PRODUCTS, CATEGORIES, BRANDS } from "./data";
import { prisma, isDatabaseConfigured, isDbConnectionError } from "./prisma";
import { productQueryMissingSecondarySupport } from "./prisma-product-secondary-fallback";
import { facetKeysFromAttributes, parseFacetAttributesFromUnknown } from "./facet-attributes";

export type LocaleCode = "en" | "ar";

function mapDbToProduct(
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
    inStock: boolean;
    featured: boolean;
    isNew: boolean;
    icon: string;
    rating: number;
    reviews: number;
    sales: number;
    model3d: string | null;
    sku: string;
    createdAt: Date;
    category: { slug: string };
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
    specs:
      row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
        ? (row.specs as Record<string, string>)
        : undefined,
  };
}

function mapDbToCategory(
  row: {
    slug: string;
    nameEn: string;
    nameAr: string;
    icon: string;
    color: string;
    facetKeys: unknown;
    backgroundImageUrl: string | null;
  },
  locale: LocaleCode,
): Category {
  const facetAttributes: FacetAttributeDef[] = parseFacetAttributesFromUnknown(row.facetKeys);
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

const storefrontProductIncludeBase = {
  category: { select: { slug: true } },
  images: { select: { url: true, sortOrder: true } },
  brandRef: { select: { nameEn: true, nameAr: true } },
} as const;

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
      if (!productQueryMissingSecondarySupport(e)) throw e;
      console.warn("[catalog] loading products without secondaryCategories (run `npx prisma generate` + migrate).");
      rows = await prisma.product.findMany({
        where: { published: true },
        include: { ...storefrontProductIncludeBase },
        orderBy: { id: "asc" },
      });
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
    const rows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map((r) =>
      mapDbToCategory(
        {
          slug: r.slug,
          nameEn: r.nameEn,
          nameAr: r.nameAr,
          icon: r.icon,
          color: r.color,
          facetKeys: r.facetKeys,
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
