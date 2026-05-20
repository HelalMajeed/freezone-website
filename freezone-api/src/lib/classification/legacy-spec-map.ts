import {
  extractDisplayResolution,
  extractGpuModel,
  extractProcessorFamily,
  extractRamSizeGb,
  extractRefreshRateHz,
  extractScreenSizeInches,
  extractStorageSizeGb,
  sanitizeStoredScreenSize,
} from "./laptop-filter-extract";

/** Legacy `product.specs` keys → current `CategoryAttribute.key` per category slug. */
export const LEGACY_SPEC_KEY_ALIASES: Record<string, Record<string, string[]>> = {
  laptops: {
    processor_full: ["cpu", "processor", "processor_full"],
    processor_family: ["processor_family"],
    ram_display: ["ram", "ram_display"],
    ram_size: ["ram_size"],
    storage_display: ["storage", "storage_display"],
    storage_type: ["storageType", "storage_type"],
    storage_size: ["storage_size", "storageSize"],
    gpu_full: ["gpu", "gpu_full"],
    gpu_model: ["gpu_model"],
    screen_size: ["screen", "screenSize", "screen_size"],
    refresh_rate: ["refreshRate", "refresh_rate"],
    brand: ["brand"],
  },
  phones: {
    brand: ["brand"],
    chipset: ["chipset", "cpu"],
    ram: ["ram"],
    storage: ["storage"],
    screen_size: ["screen", "screenSize", "screen_size"],
    refresh_rate: ["refreshRate", "refresh_rate"],
    battery_capacity: ["battery", "battery_capacity"],
    network_5g: ["network_5g", "5g"],
    color: ["color"],
  },
  monitors: {
    brand: ["brand"],
    panel_type: ["panelType", "panel_type"],
    resolution: ["resolution"],
    refresh_rate: ["refreshRate", "refresh_rate"],
    size_inch: ["screenSize", "screen_size", "size_inch"],
    hdr: ["hdr"],
    response_time_ms: ["response_time", "response_time_ms"],
  },
  computers: {
    cpu: ["cpu", "processor_family"],
    ram: ["ram", "ram_size"],
    gpu: ["gpu", "gpu_model"],
    storage: ["storage", "storage_size"],
    screen_size: ["screen", "screenSize"],
  },
  components: {
    componentType: ["componentType", "component_type"],
    cpu: ["cpu"],
    gpu: ["gpu"],
    ram: ["ram"],
    socketType: ["socketType", "socket_type"],
    psuWattage: ["psuWattage", "psu_wattage"],
  },
};

export function legacyKeysForAttribute(catSlug: string, attributeKey: string): string[] {
  const aliases = LEGACY_SPEC_KEY_ALIASES[catSlug]?.[attributeKey];
  if (aliases?.length) return [attributeKey, ...aliases];
  return [attributeKey];
}

/** Normalize messy legacy text into filter-friendly display values. */
export function normalizeLegacySpecDisplay(attributeKey: string, raw: string): string {
  const s = raw.trim();
  if (!s) return "";

  if (attributeKey === "ram_size" || attributeKey === "ram") {
    const gb = extractRamSizeGb(s);
    if (gb) return gb;
  }
  if (attributeKey === "storage_size" || attributeKey === "storage") {
    const gb = extractStorageSizeGb(s);
    if (gb) return gb;
  }
  if (attributeKey === "screen_size" || attributeKey === "size_inch") {
    const inch = extractScreenSizeInches(s) ?? sanitizeStoredScreenSize(s);
    if (inch) return inch;
    return "";
  }
  if (attributeKey === "display_resolution" || attributeKey === "screen_resolution" || attributeKey === "resolution") {
    const res = extractDisplayResolution(s);
    if (res) return res;
    return "";
  }
  if (attributeKey === "refresh_rate") {
    const hz = extractRefreshRateHz(s);
    if (hz) return hz;
    return "";
  }
  if (attributeKey === "battery_capacity") {
    const mah = s.match(/(\d+)\s*mAh/i);
    if (mah) return mah[1];
  }
  if (attributeKey === "processor_family" || attributeKey === "cpu" || attributeKey === "chipset") {
    const fam = extractProcessorFamily(s);
    if (fam) return fam;
    return "";
  }
  if (attributeKey === "gpu_model" || attributeKey === "gpu") {
    const gpu = extractGpuModel(s);
    if (gpu) return gpu;
    return "";
  }
  if (attributeKey === "storage_type") {
    if (/nvme|ssd/i.test(s)) return "SSD";
    if (/hdd/i.test(s)) return "HDD";
  }

  return "";
}

/** Attributes where URL filter uses normalized labels and fuzzy text match. */
export const FUZZY_SELECT_FILTER_KEYS = new Set([
  "processor_family",
  "cpu",
  "chipset",
  "gpu_model",
  "gpu",
]);

export function facetValueForFilter(attributeKey: string, raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const norm = normalizeLegacySpecDisplay(attributeKey, raw);
  return norm?.trim() || undefined;
}

export function fuzzySelectFilterMatch(
  attributeKey: string,
  displayValue: string | undefined,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  if (!displayValue?.trim()) return false;
  const d = facetValueForFilter(attributeKey, displayValue)?.toLowerCase() ?? "";
  return selected.some((sel) => {
    const s = facetValueForFilter(attributeKey, sel)?.toLowerCase() ?? sel.trim().toLowerCase();
    if (!s || !d) return false;
    if (d === s) return true;
    return d.includes(s) || s.includes(d);
  });
}

/** Raw legacy text before normalization (for displayValue). */
export function readLegacyRawDisplay(
  specs: Record<string, string> | undefined,
  catSlug: string,
  attributeKey: string,
): string | undefined {
  if (!specs) return undefined;
  for (const key of legacyKeysForAttribute(catSlug, attributeKey)) {
    const raw = specs[key];
    if (raw !== undefined && String(raw).trim() !== "") return String(raw).trim();
  }
  return undefined;
}

export function readLegacySpecValue(
  specs: Record<string, string> | undefined,
  catSlug: string,
  attributeKey: string,
): string | undefined {
  if (!specs) return undefined;
  for (const key of legacyKeysForAttribute(catSlug, attributeKey)) {
    const raw = specs[key];
    if (raw === undefined || String(raw).trim() === "") continue;
    const norm = normalizeLegacySpecDisplay(attributeKey, String(raw));
    if (norm) return norm;
  }
  return undefined;
}

/** Build canonical-key specs map from legacy product.specs for persistence. */
export function remapLegacySpecsForCategory(
  catSlug: string,
  specs: Record<string, string>,
  schemaKeys: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of schemaKeys) {
    const v = readLegacySpecValue(specs, catSlug, key);
    if (v) out[key] = v;
  }
  return out;
}
