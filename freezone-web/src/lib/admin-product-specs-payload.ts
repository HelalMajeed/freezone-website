import type { FacetAttributeDef } from "@/lib/data";
import { resolveDisplaySpecKey } from "@/lib/classification/filter-display-link";

/** Build API specs body: short filter tokens + optional linked display spec keys. */
export function buildSpecsPayloadForSave(
  attributes: FacetAttributeDef[],
  displaySpecs: Record<string, string>,
  filterSpecs: Record<string, string>,
  categorySlug?: string,
): Record<string, string | { display: string; filter?: string }> {
  const out: Record<string, string | { display: string; filter?: string }> = {};
  const writtenDisplayKeys = new Set<string>();

  for (const attr of attributes) {
    if (!attr.filterable) continue;
    const filter = (filterSpecs[attr.key] ?? "").trim();
    const displayKey = resolveDisplaySpecKey(attr, categorySlug);
    const linkedDisplay = displayKey ? (displaySpecs[displayKey] ?? "").trim() : "";
    const inlineDisplay = (displaySpecs[attr.key] ?? "").trim();

    if (filter) {
      out[attr.key] =
        displayKey && linkedDisplay
          ? { display: "", filter }
          : inlineDisplay
            ? { display: inlineDisplay, filter }
            : { display: "", filter };
    }

    if (displayKey && linkedDisplay && !writtenDisplayKeys.has(displayKey)) {
      out[displayKey] = linkedDisplay;
      writtenDisplayKeys.add(displayKey);
    } else if (!displayKey && (inlineDisplay || filter)) {
      if (inlineDisplay && filter) out[attr.key] = { display: inlineDisplay, filter };
      else if (filter) out[attr.key] = { display: "", filter };
      else if (inlineDisplay) out[attr.key] = inlineDisplay;
    }
  }

  for (const attr of attributes) {
    if (attr.filterable) continue;
    const display = (displaySpecs[attr.key] ?? "").trim();
    if (display) out[attr.key] = display;
  }

  return out;
}
