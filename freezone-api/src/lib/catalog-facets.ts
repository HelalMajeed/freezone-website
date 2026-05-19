import type { FacetAttributeDef } from "./data";
import type { CatalogFilterInput } from "./catalog-filter";
import { queryCatalogFacetCounts, type FacetCount } from "./catalog-filter";
import { categoryAttributeRowsToFacetDefs } from "./classification/sync";
import { formatFacetFilterLabel, sanitizeFacetFilterToken } from "./classification/facet-filter-token";
import { prisma, isDatabaseConfigured } from "./prisma";

export type FacetFilterOption = {
  label: string;
  value: string;
  count: number;
};

export type FacetFilterDefinition = {
  key: string;
  label: string;
  type: string;
  unit?: string;
  options: FacetFilterOption[];
};

export type CatalogFacetsResult = {
  filters: FacetFilterDefinition[];
};

async function loadFilterableFacetDefs(catSlug: string): Promise<FacetAttributeDef[]> {
  const cat = await prisma.category.findFirst({
    where: { slug: catSlug },
    include: {
      categoryAttributes: {
        where: { filterable: true, active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!cat?.categoryAttributes?.length) return [];
  return categoryAttributeRowsToFacetDefs(cat.categoryAttributes);
}

function facetCountsToOptions(
  def: FacetAttributeDef,
  counts: FacetCount[],
  locale: "en" | "ar",
): FacetFilterOption[] {
  const seen = new Set<string>();
  const out: FacetFilterOption[] = [];

  const seedFromSchema = def.options?.length
    ? def.options.map((v) => sanitizeFacetFilterToken(def.key, v)).filter(Boolean) as string[]
    : [];

  for (const token of seedFromSchema) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push({
      value: token,
      label: formatFacetFilterLabel(def.key, token, def.unit, locale),
      count: counts.find((c) => c.value === token)?.count ?? 0,
    });
  }

  for (const { value, count } of counts) {
    const token = sanitizeFacetFilterToken(def.key, value);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push({
      value: token,
      label: formatFacetFilterLabel(def.key, token, def.unit, locale),
      count,
    });
  }

  return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export async function queryCatalogFacets(
  input: CatalogFilterInput,
): Promise<CatalogFacetsResult> {
  const locale = input.locale;
  if (!input.cat || !isDatabaseConfigured()) {
    return { filters: [] };
  }

  const facetDefs = await loadFilterableFacetDefs(input.cat);
  if (!facetDefs.length) return { filters: [] };

  const poolInput: CatalogFilterInput = { ...input, facets: undefined };
  const rawCounts = await queryCatalogFacetCounts(poolInput, facetDefs);

  const filters: FacetFilterDefinition[] = facetDefs.map((def) => {
    const label = locale === "ar" ? def.name_ar : def.name_en;
    const counts = rawCounts[def.key] ?? [];
    const options = facetCountsToOptions(def, counts, locale).filter((o) => o.count > 0 || def.options?.includes(o.value));
    return {
      key: def.key,
      label: label.trim() || def.key,
      type: def.type ?? "SELECT",
      unit: def.unit,
      options,
    };
  });

  return { filters: filters.filter((f) => f.options.length > 0) };
}
