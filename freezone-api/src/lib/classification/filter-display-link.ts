import type { CategoryAttributeRow } from "./types";

/** Default filter key → PDP display spec key (all categories). */
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

/** Per category slug overrides (extends defaults). */
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
  printers: { printer_type: "printer_full" },
  audio: {
    audio_type: "audio_full",
    connection_type: "audio_full",
    battery_life: "battery_full",
  },
  security: { security_type: "security_full", resolution: "security_full" },
  "smart-home": { device_type: "smart_home_full", ecosystem: "smart_home_full" },
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

export type FilterDisplayLinkSource = Pick<
  CategoryAttributeRow,
  "key" | "filterable" | "displaySpecKey" | "linkDisplaySpec"
>;

function inferDisplayKeyFromFilterKey(filterKey: string): string | null {
  if (filterKey.endsWith("_family")) return filterKey.replace(/_family$/, "_full");
  if (filterKey.endsWith("_model")) return filterKey.replace(/_model$/, "_full");
  if (filterKey.endsWith("_size")) return filterKey.replace(/_size$/, "_display");
  return DEFAULT_FILTER_TO_DISPLAY_KEY[filterKey] ?? null;
}

export function resolveDisplaySpecKey(
  attr: FilterDisplayLinkSource,
  categorySlug?: string,
): string | null {
  if (attr.filterable !== true) return null;
  const explicitKey = attr.displaySpecKey?.trim();
  if (explicitKey) return explicitKey;
  if (attr.linkDisplaySpec === false) return null;
  const overrides = categorySlug ? CATEGORY_FILTER_DISPLAY_OVERRIDES[categorySlug] : undefined;
  const mapped = overrides?.[attr.key] ?? DEFAULT_FILTER_TO_DISPLAY_KEY[attr.key];
  return mapped ?? inferDisplayKeyFromFilterKey(attr.key);
}

export function displaySpecUsesLinkedFilter(
  displayKey: string,
  filterAttrs: FilterDisplayLinkSource[],
  categorySlug?: string,
): boolean {
  return filterAttrs.some((a) => resolveDisplaySpecKey(a, categorySlug) === displayKey);
}
