import type { CategoryAttributeRow } from "./types";
import { normalizeFilterValue } from "./filter-value";
import { facetValueForFilter } from "./legacy-spec-map";
import {
  extractDisplayResolution,
  extractGpuModel,
  extractProcessorFamily,
  extractRefreshRateHz,
  extractScreenSizeInches,
} from "./laptop-filter-extract";
import { sanitizeFacetFilterToken } from "./facet-filter-token";

/**
 * Derive short filter tokens for related schema keys from full display text.
 * Does not overwrite explicit filter values already set.
 */
export function deriveFilterFacetsFromDisplay(
  schema: CategoryAttributeRow[],
  displayByKey: Record<string, string>,
  existingFilterByKey: Record<string, string>,
): Record<string, string> {
  const schemaKeys = new Set(schema.map((a) => a.key));
  const out: Record<string, string> = { ...existingFilterByKey };

  const setIfEmptyOrInvalid = (key: string, value: string) => {
    if (!schemaKeys.has(key)) return;
    const v = value.trim();
    if (!v) return;
    const existing = out[key]?.trim();
    if (existing && sanitizeFacetFilterToken(key, existing)) return;
    out[key] = v;
  };

  const processorText =
    displayByKey.processor_full?.trim() ||
    displayByKey.processor?.trim() ||
    displayByKey.processor_family?.trim() ||
    displayByKey.cpu?.trim() ||
    "";
  if (processorText) {
    const fam =
      extractProcessorFamily(processorText) ??
      facetValueForFilter("processor_family", processorText) ??
      normalizeFilterValue("processor_family", processorText);
    if (fam) setIfEmptyOrInvalid("processor_family", fam);
    if (/Intel/i.test(processorText)) setIfEmptyOrInvalid("processor_brand", "Intel");
    if (/AMD/i.test(processorText)) setIfEmptyOrInvalid("processor_brand", "AMD");
    if (/Apple/i.test(processorText)) setIfEmptyOrInvalid("processor_brand", "Apple");
    const model = processorText.match(/i[3579]-\d{4,5}[A-Z]{0,3}/i) ?? processorText.match(/Ryzen\s*\d+\s*\d{4}/i);
    if (model) setIfEmptyOrInvalid("processor_model", model[0].replace(/\s+/g, " ").trim());
  }

  const ramText = displayByKey.ram_display?.trim() || displayByKey.ram?.trim() || displayByKey.ram_size?.trim() || "";
  if (ramText) {
    setIfEmptyOrInvalid("ram_size", normalizeFilterValue("ram_size", ramText));
    const ddr = ramText.match(/DDR\d/i);
    if (ddr) setIfEmptyOrInvalid("ram_type", ddr[0].toUpperCase());
  }

  const storageText =
    displayByKey.storage_display?.trim() || displayByKey.storage?.trim() || displayByKey.storage_size?.trim() || "";
  if (storageText) {
    setIfEmptyOrInvalid("storage_size", normalizeFilterValue("storage_size", storageText));
    if (/ssd/i.test(storageText)) setIfEmptyOrInvalid("storage_type", "SSD");
    else if (/hdd/i.test(storageText)) setIfEmptyOrInvalid("storage_type", "HDD");
    if (/nvme/i.test(storageText)) setIfEmptyOrInvalid("storage_interface", "NVMe");
  }

  const gpuText = displayByKey.gpu_full?.trim() || displayByKey.gpu?.trim() || displayByKey.gpu_model?.trim() || "";
  if (gpuText) {
    const gpu =
      extractGpuModel(gpuText) ??
      facetValueForFilter("gpu_model", gpuText) ??
      normalizeFilterValue("gpu_model", gpuText);
    if (gpu) setIfEmptyOrInvalid("gpu_model", gpu);
    const vram = gpuText.match(/(\d+)\s*GB\s*GDDR/i) ?? gpuText.match(/(\d+)\s*GB/i);
    if (vram) setIfEmptyOrInvalid("gpu_vram", vram[1]);
  }

  const screenCombined = [
    displayByKey.screen_size,
    displayByKey.screen,
    displayByKey.display_resolution,
    displayByKey.refresh_rate,
  ]
    .filter((x) => x?.trim())
    .join(" ");
  if (screenCombined) {
    const inch = extractScreenSizeInches(screenCombined);
    if (inch) setIfEmptyOrInvalid("screen_size", inch);
    const res = extractDisplayResolution(screenCombined);
    if (res) setIfEmptyOrInvalid("display_resolution", res);
    const hz = extractRefreshRateHz(screenCombined);
    if (hz) setIfEmptyOrInvalid("refresh_rate", hz);
  }

  const weightText = displayByKey.weight?.trim() || "";
  if (weightText) {
    setIfEmptyOrInvalid("weight", normalizeFilterValue("weight", weightText));
  }

  return out;
}
