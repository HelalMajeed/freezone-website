import type { AttributeType } from "./types";

export type AttributePresetMeta = {
  type?: AttributeType;
  filterable?: boolean;
  searchable?: boolean;
  comparable?: boolean;
  displayGroup?: string;
  required?: boolean;
  unit?: string;
  options?: string[];
};

/** Stronger defaults than docs: infer type + filterability from known catalog keys. */
const KEY_PRESETS: Record<string, AttributePresetMeta> = {
  brand: { type: "SELECT", filterable: true, searchable: true, displayGroup: "identity" },
  model: { type: "TEXT", filterable: false, searchable: true, displayGroup: "identity" },
  ram: { type: "SELECT", filterable: true, comparable: true, unit: "GB" },
  ram_size: { type: "SELECT", filterable: true, comparable: true, unit: "GB" },
  storage: { type: "SELECT", filterable: true, comparable: true, unit: "GB" },
  storage_type: { type: "SELECT", filterable: true, displayGroup: "storage" },
  cpu: { type: "SELECT", filterable: true, searchable: true, comparable: true },
  processor_family: { type: "SELECT", filterable: true, searchable: true, comparable: true },
  gpu: { type: "SELECT", filterable: true, comparable: true },
  gpu_model: { type: "SELECT", filterable: true, comparable: true },
  chipset: { type: "SELECT", filterable: true },
  screen_size: { type: "RANGE", filterable: true, comparable: true, unit: "inch" },
  size_inch: { type: "RANGE", filterable: true, unit: "inch" },
  refresh_rate: { type: "RANGE", filterable: true, comparable: true, unit: "Hz" },
  resolution: { type: "SELECT", filterable: true, comparable: true },
  panel_type: { type: "SELECT", filterable: true },
  response_time_ms: { type: "RANGE", filterable: true, unit: "ms" },
  battery_capacity: { type: "RANGE", filterable: true, unit: "mAh" },
  battery_wh: { type: "RANGE", filterable: true, unit: "Wh" },
  network_5g: { type: "BOOLEAN", filterable: true },
  hdr: { type: "BOOLEAN", filterable: true },
  ibis: { type: "BOOLEAN", filterable: true },
  weight: { type: "RANGE", filterable: true, unit: "kg" },
  color: { type: "COLOR", filterable: true, displayGroup: "variants" },
  wifi: { type: "MULTI_SELECT", filterable: true },
  camera_type: { type: "SELECT", filterable: true },
  sensor_type: { type: "SELECT", filterable: true },
  resolution_mp: { type: "RANGE", filterable: true, unit: "MP" },
  max_video_resolution: { type: "SELECT", filterable: true },
  mount: { type: "SELECT", filterable: true },
  release_year: { type: "RANGE", filterable: true, comparable: true },
};

export function defaultAttributeMetaForKey(key: string): AttributePresetMeta {
  const k = key.trim().toLowerCase();
  return KEY_PRESETS[k] ?? { type: "SELECT", filterable: true };
}
