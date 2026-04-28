import type { Product } from "./data";

export function productBelongsToCategory(product: Pick<Product, "cat" | "extraCats">, slug: string): boolean {
  if (!slug) return false;
  if (product.cat === slug) return true;
  return Boolean(product.extraCats?.some((c) => c === slug));
}
