import type { Category, Product } from "@/lib/data";
import { productCategorySlugs } from "@/lib/productCategoryMembership";
import {
  FACET_ADMIN_LABEL_AR,
  FACET_ADMIN_LABEL_EN,
  getFacetGroupForSpecKey,
  type FacetUiGroup,
} from "@/lib/facet-admin-labels";

/** Tokens for matching: lowercase, split on spaces / Latin or Arabic comma. */
export function tokenizeSearchQuery(raw: string): string[] {
  return raw
    .trim()
    .toLowerCase()
    .split(/[\s،,]+/)
    .filter(Boolean);
}

/** Display tokens keep user casing (for chips). */
export function tokenizeSearchQueryDisplay(raw: string): string[] {
  return raw.trim().split(/[\s،,]+/).filter(Boolean);
}

export type ProductCatalogSearchMatch = {
  matches: boolean;
  /** Higher = stronger spec alignment (used when sort is “relevant”). */
  score: number;
  /** Distinct spec keys that best explain hits (stable order). */
  explainingKeys: string[];
  /** Facet UI group ids touched by those keys (order preserved). */
  groupIds: string[];
};

type SpecBundle = { key: string; value: string; mini: string; group: FacetUiGroup | null };

function buildSpecBundles(product: Product, categories: Category[]): SpecBundle[] {
  const bundles: SpecBundle[] = [];
  if (!product.specs) return bundles;
  const cat = categories.find((c) => c.id === product.cat);
  const attrFor = (key: string) => cat?.facetAttributes?.find((a) => a.key === key);
  for (const [k, v] of Object.entries(product.specs)) {
    const vs = String(v ?? "").trim();
    if (!vs) continue;
    const g = getFacetGroupForSpecKey(k);
    const custom = attrFor(k);
    const ar = (custom?.name_ar ?? FACET_ADMIN_LABEL_AR[k] ?? "").toLowerCase();
    const en = (custom?.name_en ?? FACET_ADMIN_LABEL_EN[k] ?? "").toLowerCase();
    const mini = [k, vs, ar, en, (g?.titleAr ?? "").toLowerCase(), (g?.titleEn ?? "").toLowerCase()].join(
      " \n ",
    );
    bundles.push({ key: k, value: vs, mini, group: g });
  }
  return bundles;
}

/**
 * Evaluate catalog text search with bilingual spec labels and facet group titles in the haystack.
 * All tokens must match (AND). Returns `null` when the query is empty (caller: no search filter).
 */
export function evaluateProductCatalogSearch(
  product: Product,
  categories: Category[],
  rawQuery: string,
): ProductCatalogSearchMatch | null {
  const tokens = tokenizeSearchQuery(rawQuery);
  if (tokens.length === 0) return null;

  const catName = categories.find((c) => c.id === product.cat)?.name ?? "";
  const bundles = buildSpecBundles(product, categories);

  const extraCategoryHaystack = productCategorySlugs(product).flatMap((slug) => {
    const n = categories.find((c) => c.id === slug)?.name ?? "";
    return [slug, n];
  });

  const genericParts = [
    product.name,
    product.brand,
    product.desc,
    product.cat,
    catName,
    ...extraCategoryHaystack,
    product.storage,
    product.date,
  ];
  for (const b of bundles) {
    const cAttr = categories.find((c) => c.id === product.cat)?.facetAttributes?.find((a) => a.key === b.key);
    genericParts.push(
      b.key,
      b.value,
      cAttr?.name_ar ?? FACET_ADMIN_LABEL_AR[b.key],
      cAttr?.name_en ?? FACET_ADMIN_LABEL_EN[b.key],
    );
    if (b.group) {
      genericParts.push(b.group.titleAr, b.group.titleEn);
    }
  }
  const genericHaystack = genericParts.join(" \n ").toLowerCase();

  let score = 0;
  const explainingKeys: string[] = [];
  const groupIdOrder: string[] = [];
  const seenGroups = new Set<string>();

  for (const t of tokens) {
    if (!genericHaystack.includes(t)) {
      return { matches: false, score: 0, explainingKeys: [], groupIds: [] };
    }

    let bestKey: string | null = null;
    let bestWeight = 0;

    for (const b of bundles) {
      if (!b.mini.includes(t)) continue;
      let w = 2;
      const vl = b.value.toLowerCase();
      if (vl.includes(t)) w = 10;
      else if (b.key.toLowerCase().includes(t)) w = 6;
      else {
        const cAttr = categories.find((c) => c.id === product.cat)?.facetAttributes?.find((a) => a.key === b.key);
        const ar = (cAttr?.name_ar ?? FACET_ADMIN_LABEL_AR[b.key] ?? "").toLowerCase();
        const en = (cAttr?.name_en ?? FACET_ADMIN_LABEL_EN[b.key] ?? "").toLowerCase();
        if (ar.includes(t) || en.includes(t)) w = 5;
        else if (
          (b.group?.titleAr ?? "").toLowerCase().includes(t) ||
          (b.group?.titleEn ?? "").toLowerCase().includes(t)
        )
          w = 4;
      }
      if (w > bestWeight) {
        bestWeight = w;
        bestKey = b.key;
      }
    }

    if (bestKey) {
      score += bestWeight;
      if (!explainingKeys.includes(bestKey)) explainingKeys.push(bestKey);
      const g = bundles.find((x) => x.key === bestKey)?.group;
      if (g && !seenGroups.has(g.id)) {
        seenGroups.add(g.id);
        groupIdOrder.push(g.id);
      }
    } else {
      score += 1;
    }
  }

  return { matches: true, score, explainingKeys, groupIds: groupIdOrder };
}

/**
 * True if the product matches the search query: every token must appear in the expanded haystack
 * (name, brand, description, category, bilingual spec labels & group titles, spec values).
 */
export function productMatchesCatalogQuery(product: Product, categories: Category[], rawQuery: string): boolean {
  const ev = evaluateProductCatalogSearch(product, categories, rawQuery);
  return ev === null || ev.matches;
}
