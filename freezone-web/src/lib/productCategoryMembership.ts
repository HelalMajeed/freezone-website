import type { Product } from "@/lib/data";

export function productBelongsToCategory(product: Pick<Product, "cat" | "extraCats">, slug: string): boolean {
  if (!slug) return false;
  if (product.cat === slug) return true;
  return Boolean(product.extraCats?.some((c) => c === slug));
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
