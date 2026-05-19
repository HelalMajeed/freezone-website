import { facetValueForFilter } from "./legacy-spec-map";

/** Short normalized filter label from full display text (storefront client fallback). */
export function normalizeFilterValue(attributeKey: string, displayText: string): string {
  const s = displayText.trim();
  if (!s) return "";
  const mapped = facetValueForFilter(attributeKey, s);
  if (mapped?.trim()) return mapped.trim();

  const key = attributeKey.toLowerCase();
  if (key === "ram_size" || key === "ram") {
    const m = s.match(/(\d+)\s*GB/i);
    if (m) return m[1];
  }
  if (key === "storage_size" || key === "storage") {
    const tb = s.match(/(\d+(?:\.\d+)?)\s*TB/i);
    if (tb) return String(Math.round(parseFloat(tb[1]) * 1024));
    const gb = s.match(/(\d+)\s*GB/i);
    if (gb) return gb[1];
  }
  if (key === "screen_size" || key === "size_inch") {
    const inch = s.match(/(\d+(?:\.\d+)?)\s*[-\s]?inch/i) ?? s.match(/(\d+(?:\.\d+)?)\s*"/i);
    if (inch) return inch[1];
  }
  return "";
}
