/** Legacy `product.specs` keys → current `CategoryAttribute.key` per category slug. */
export const LEGACY_SPEC_KEY_ALIASES: Record<string, Record<string, string[]>> = {
  laptops: {
    processor_family: ["cpu", "processor", "processor_family"],
    ram_size: ["ram", "ram_size"],
    storage_type: ["storageType", "storage_type"],
    storage_size: ["storage", "storage_size", "storageSize"],
    gpu_model: ["gpu", "gpu_model"],
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

export function normalizeLegacySpecDisplay(attributeKey: string, raw: string): string {
  const s = raw.trim();
  if (!s) return "";

  if (attributeKey === "ram_size" || attributeKey === "ram") {
    const m = s.match(/(\d+)\s*GB/i);
    if (m) return m[1];
  }
  if (attributeKey === "storage_size" || attributeKey === "storage") {
    const tb = s.match(/(\d+(?:\.\d+)?)\s*TB/i);
    if (tb) return String(Math.round(parseFloat(tb[1]) * 1024));
    const gb = s.match(/(\d+)\s*GB/i);
    if (gb) return gb[1];
  }
  if (attributeKey === "screen_size" || attributeKey === "size_inch") {
    const inch = s.match(/(\d+(?:\.\d+)?)\s*[-\s]?inch/i) ?? s.match(/(\d+(?:\.\d+)?)\s*"/i);
    if (inch) return inch[1];
    const cm = s.match(/(\d+(?:\.\d+)?)\s*cm/i);
    if (cm) return String(Math.round((parseFloat(cm[1]) / 2.54) * 10) / 10);
  }
  if (attributeKey === "refresh_rate") {
    const hz = s.match(/(\d+)\s*Hz/i);
    if (hz) return hz[1];
  }
  if (attributeKey === "battery_capacity") {
    const mah = s.match(/(\d+)\s*mAh/i);
    if (mah) return mah[1];
  }
  if (attributeKey === "processor_family" || attributeKey === "cpu" || attributeKey === "chipset") {
    const ultra = s.match(/(?:Core[^0-9]*)?Ultra[^0-9]*(\d+)/i);
    if (ultra) return `Ultra ${ultra[1]}`;
    const coreI = s.match(/Core[^0-9]*i\s*([3579])/i);
    if (coreI) return `Core i${coreI[1]}`;
    const ryzenAi = s.match(/Ryzen[^0-9]*AI[^0-9]*(\d+)/i);
    if (ryzenAi) return `Ryzen AI ${ryzenAi[1]}`;
    const ryzen = s.match(/Ryzen[^0-9]*(\d+)/i);
    if (ryzen) return `Ryzen ${ryzen[1]}`;
    const apple = s.match(/Apple\s*M\d(?:\s*(?:Pro|Max|Ultra))?/i);
    if (apple) return apple[0].replace(/\s+/g, " ").trim();
    const snap = s.match(/Snapdragon\s*\d+/i);
    if (snap) return snap[0].replace(/\s+/g, " ").trim();
    if (/Intel\s*Core/i.test(s)) return "Intel Core";
    return s.length > 48 ? `${s.slice(0, 48)}…` : s;
  }
  if (attributeKey === "gpu_model" || attributeKey === "gpu") {
    const m = s.match(/RTX\s*\d+/i) ?? s.match(/GTX\s*\d+/i) ?? s.match(/RX\s*\d+/i);
    if (m) return m[0].toUpperCase();
    return s.length > 48 ? `${s.slice(0, 48)}…` : s;
  }
  if (attributeKey === "storage_type") {
    if (/nvme|ssd/i.test(s)) return "SSD";
    if (/hdd/i.test(s)) return "HDD";
  }

  return s.length > 96 ? `${s.slice(0, 96)}…` : s;
}

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
  return norm || raw.trim();
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
