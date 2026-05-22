import type { FacetAttributeDef } from "@/lib/data";

export const DEFAULT_FILTER_TO_DISPLAY_KEY: Record<string, string> = {
  processor_family: "processor_full",
  cpu: "processor_full",
  chipset_family: "chipset_full",
  chipset: "chipset_full",
  gpu_model: "gpu_full",
  gpu: "gpu_full",
  ram_size: "ram_display",
  ram: "ram_display",
  memory: "ram_display",
  storage_size: "storage_display",
  storage: "storage_display",
  capacity: "storage_display",
  screen_size: "display_full",
  display_resolution: "display_full",
  refresh_rate: "display_full",
  display_panel: "display_full",
  panel_type: "display_full",
  resolution: "display_full",
  size_inch: "display_full",
  battery_capacity: "battery_full",
  main_camera_mp: "camera_full",
  camera_mp: "camera_full",
  network_5g: "network_full",
  response_time_ms: "performance_full",
  hdr: "display_full",
  wattage: "charging_full",
  read_speed: "performance_full",
};

export const CATEGORY_FILTER_DISPLAY_OVERRIDES: Record<string, Record<string, string>> = {
  laptops: DEFAULT_FILTER_TO_DISPLAY_KEY,
  phones: {
    chipset_family: "chipset_full",
    ram: "ram_display",
    storage: "storage_display",
    screen_size: "display_full",
    refresh_rate: "display_full",
    battery_capacity: "battery_full",
    main_camera_mp: "camera_full",
    network_5g: "network_full",
  },
  monitors: {
    display_resolution: "display_full",
    size_inch: "display_full",
    resolution: "display_full",
    refresh_rate: "display_full",
    panel_type: "display_full",
    screen_shape: "display_full",
    response_time_ms: "performance_full",
    hdr: "display_full",
  },
  storage: {
    capacity: "storage_display",
    storage_type: "storage_display",
    interface: "storage_display",
    read_speed: "performance_full",
  },
  networking: {
    network_type: "network_full",
    wifi_standard: "network_full",
    speed: "network_full",
    ports: "network_full",
  },
  printers: {
    printer_type: "printer_full",
  },
  audio: {
    audio_type: "audio_full",
    connection_type: "audio_full",
    battery_life: "battery_full",
  },
  security: {
    security_type: "security_full",
    resolution: "security_full",
  },
  "smart-home": {
    device_type: "smart_home_full",
    ecosystem: "smart_home_full",
  },
  cpus: { socket: "spec_full", generation: "spec_full" },
  gpus: { gpu_model: "spec_full", vram: "spec_full" },
  motherboards: { chipset: "spec_full", socket: "spec_full" },
  memory: { capacity: "spec_full", memory_type: "spec_full" },
  "power-supplies": { wattage: "spec_full" },
  cooling: { cooling_type: "spec_full" },
  tvs: {
    size_inch: "display_full",
    resolution: "display_full",
    panel_type: "display_full",
  },
};

function inferDisplayKeyFromFilterKey(filterKey: string): string | null {
  if (filterKey.endsWith("_family")) return filterKey.replace(/_family$/, "_full");
  if (filterKey.endsWith("_model")) return filterKey.replace(/_model$/, "_full");
  if (filterKey.endsWith("_size")) return filterKey.replace(/_size$/, "_display");
  return DEFAULT_FILTER_TO_DISPLAY_KEY[filterKey] ?? null;
}

export function resolveDisplaySpecKey(attr: FacetAttributeDef, categorySlug?: string): string | null {
  if (attr.filterable !== true) return null;
  const explicitKey = attr.displaySpecKey?.trim();
  if (explicitKey) return explicitKey;
  if (attr.linkDisplaySpec === false) return null;
  const overrides = categorySlug ? CATEGORY_FILTER_DISPLAY_OVERRIDES[categorySlug] : undefined;
  return overrides?.[attr.key] ?? DEFAULT_FILTER_TO_DISPLAY_KEY[attr.key] ?? inferDisplayKeyFromFilterKey(attr.key);
}

export type SmartSpecRow = {
  id: string;
  titleAr: string;
  titleEn: string;
  filterAttrs: FacetAttributeDef[];
  displaySpecKey: string | null;
  displaySpecRequired: boolean;
};

export function buildSmartSpecRows(
  attributes: FacetAttributeDef[],
  categorySlug?: string,
): SmartSpecRow[] {
  const filterable = attributes.filter((a) => a.filterable === true);
  const groups = new Map<string, FacetAttributeDef[]>();

  for (const attr of filterable) {
    const dk = resolveDisplaySpecKey(attr, categorySlug) ?? `__solo__${attr.key}`;
    const list = groups.get(dk) ?? [];
    list.push(attr);
    groups.set(dk, list);
  }

  const attrByKey = new Map(attributes.map((a) => [a.key, a]));
  const rows: SmartSpecRow[] = [];

  for (const [groupKey, filterAttrs] of groups) {
    const displaySpecKey = groupKey.startsWith("__solo__")
      ? resolveDisplaySpecKey(filterAttrs[0], categorySlug)
      : groupKey;
    const displayAttr = displaySpecKey ? attrByKey.get(displaySpecKey) : undefined;
    const first = filterAttrs[0];
    const titleAr =
      first.displaySpecNameAr?.trim() ||
      displayAttr?.name_ar?.trim() ||
      filterAttrs.map((a) => a.name_ar).join(" / ");
    const titleEn =
      first.displaySpecNameEn?.trim() ||
      displayAttr?.name_en?.trim() ||
      filterAttrs.map((a) => a.name_en).join(" / ");
    const displaySpecRequired =
      filterAttrs.some((a) => a.displaySpecRequired === true) ||
      (displayAttr?.required === true && Boolean(displaySpecKey));

    rows.push({
      id: displaySpecKey ?? filterAttrs[0].key,
      titleAr,
      titleEn,
      filterAttrs,
      displaySpecKey,
      displaySpecRequired,
    });
  }

  return rows.sort((a, b) => {
    const ao = a.filterAttrs[0]?.key ?? "";
    const bo = b.filterAttrs[0]?.key ?? "";
    return ao.localeCompare(bo);
  });
}

export function standaloneDisplayAttributes(
  attributes: FacetAttributeDef[],
  rows: SmartSpecRow[],
): FacetAttributeDef[] {
  const linkedDisplayKeys = new Set(
    rows.map((r) => r.displaySpecKey).filter((k): k is string => Boolean(k)),
  );
  const filterKeys = new Set(attributes.filter((a) => a.filterable).map((a) => a.key));
  return attributes.filter(
    (a) =>
      !a.filterable &&
      !linkedDisplayKeys.has(a.key) &&
      !filterKeys.has(a.key),
  );
}
