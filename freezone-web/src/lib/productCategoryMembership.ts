import type { Category, Product } from "@/lib/data";

export function productBelongsToCategory(product: Pick<Product, "cat" | "extraCats">, slug: string): boolean {
  if (!slug) return false;
  if (product.cat === slug) return true;
  return Boolean(product.extraCats?.some((c) => c === slug));
}

/** Direct children of a category (one-level tree via `Category.parent` slug). */
export function categoryChildren(categories: Pick<Category, "id" | "parent">[], slug: string): string[] {
  if (!slug) return [];
  return categories.filter((c) => c.parent === slug).map((c) => c.id);
}

/**
 * Tree-aware membership: a parent category also owns products homed on its
 * children. Mirrors the API's `categoryMembershipWhere`
 * (freezone-api/src/lib/catalog-filter.ts) — keep the two in sync.
 */
export function productBelongsToCategoryTree(
  product: Pick<Product, "cat" | "extraCats">,
  slug: string,
  categories: Pick<Category, "id" | "parent">[],
): boolean {
  if (productBelongsToCategory(product, slug)) return true;
  return categoryChildren(categories, slug).some((child) => productBelongsToCategory(product, child));
}

export function productCategorySlugs(product: Pick<Product, "cat" | "extraCats">): string[] {
  const extra = (product.extraCats ?? []).filter((s) => s && s !== product.cat);
  return [product.cat, ...extra];
}

export function productsShareAnyCategory(
  a: Pick<Product, "cat" | "extraCats">,
  b: Pick<Product, "cat" | "extraCats">,
): boolean {
  const sa = new Set(productCategorySlugs(a));
  return productCategorySlugs(b).some((s) => sa.has(s));
}
