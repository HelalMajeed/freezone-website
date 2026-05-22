import type { FacetAttributeDef } from "@/lib/data";
import { normalizeFilterValue } from "@/lib/classification/filter-value";
import { resolveDisplaySpecKey } from "@/lib/classification/filter-display-link";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";

export type DeriveConfidence = "high" | "medium" | "low";

export type FilterDeriveSuggestion = {
  filterKey: string;
  filterLabel: string;
  current: string;
  suggested: string;
  sourceKey: string;
  confidence: DeriveConfidence;
  warning?: string;
};

function confidenceForDerived(filterKey: string, source: string, suggested: string): DeriveConfidence {
  if (!suggested) return "low";
  const s = source.trim().toLowerCase();
  const g = suggested.trim().toLowerCase();
  if (filterKey === "gpu_model" && /rtx\s*\d{4}/i.test(s) && g.includes("rtx")) return "high";
  if (filterKey === "processor_family" && /(core\s*i\d|ryzen|ultra)/i.test(s)) return "high";
  if (s.includes(g) || g.length >= 3) return "medium";
  return "low";
}

export function buildFilterDeriveSuggestions(
  attributes: FacetAttributeDef[],
  displaySpecs: Record<string, string>,
  filterSpecs: Record<string, string>,
  categorySlug?: string,
): FilterDeriveSuggestion[] {
  const { filterableSpecs } = partitionFacetAttributes(attributes);
  const out: FilterDeriveSuggestion[] = [];

  for (const attr of filterableSpecs) {
    const displayKey = resolveDisplaySpecKey(attr, categorySlug);
    const sourceKey =
      displayKey && displaySpecs[displayKey]?.trim()
        ? displayKey
        : displaySpecs[attr.key]?.trim()
          ? attr.key
          : displayKey && displaySpecs[`${attr.key}_full`]?.trim()
            ? `${attr.key}_full`
            : displayKey ?? attr.key;

    const source = (displaySpecs[sourceKey] ?? "").trim();
    if (!source) continue;

    const suggested = normalizeFilterValue(attr.key, source);
    if (!suggested) continue;

    const current = (filterSpecs[attr.key] ?? "").trim();
    if (current === suggested) continue;

    const confidence = confidenceForDerived(attr.key, source, suggested);
    out.push({
      filterKey: attr.key,
      filterLabel: attr.name_ar || attr.name_en || attr.key,
      current,
      suggested,
      sourceKey,
      confidence,
      warning:
        confidence === "low"
          ? "ثقة منخفضة — راجع قبل التطبيق"
          : undefined,
    });
  }

  return out;
}
