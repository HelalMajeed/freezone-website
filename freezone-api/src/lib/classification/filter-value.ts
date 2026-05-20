import { facetValueForFilter } from "./legacy-spec-map";
import {
  extractDisplayResolution,
  extractRefreshRateHz,
  extractRamSizeGb,
  extractScreenSizeInches,
  extractStorageSizeGb,
  sanitizeStoredScreenSize,
} from "./laptop-filter-extract";

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
    const gb = extractRamSizeGb(s);
    if (gb) return gb;
  }
  if (key === "storage_size" || key === "storage") {
    const gb = extractStorageSizeGb(s);
    if (gb) return gb;
  }
  if (key === "display_resolution" || key === "screen_resolution" || key === "resolution") {
    const res = extractDisplayResolution(s);
    if (res) return res;
  }
  if (key === "screen_size" || key === "size_inch") {
    const inch = extractScreenSizeInches(s) ?? sanitizeStoredScreenSize(s);
    if (inch) return inch;
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
    const hz = extractRefreshRateHz(s);
    if (hz) return hz;
  }
  if (key === "storage_type") {
    if (/nvme/i.test(s)) return "SSD";
    if (/ssd/i.test(s)) return "SSD";
    if (/hdd/i.test(s)) return "HDD";
  }

  return "";
}
