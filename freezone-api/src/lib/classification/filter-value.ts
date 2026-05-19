import { facetValueForFilter } from "./legacy-spec-map";

/**
 * Derive short normalized filter token from full display text.
 * Used for sidebar facets — never show raw marketing strings.
 */
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
  if (key === "weight") {
    const kg = s.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (kg) return kg[1];
    const g = s.match(/(\d+)\s*g\b/i);
    if (g) return String(Math.round(parseFloat(g[1]) / 1000));
  }
  if (key === "battery_capacity") {
    const mah = s.match(/(\d+)\s*mAh/i);
    if (mah) return mah[1];
  }
  if (key === "refresh_rate") {
    const hz = s.match(/(\d+)\s*Hz/i);
    if (hz) return hz[1];
  }
  if (key === "storage_type") {
    if (/nvme/i.test(s)) return "SSD";
    if (/ssd/i.test(s)) return "SSD";
    if (/hdd/i.test(s)) return "HDD";
  }

  return "";
}
