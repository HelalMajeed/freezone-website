import type { CategoryAttributeRow } from "./types";
import { normalizeFilterValue } from "./filter-value";
import { facetValueForFilter } from "./legacy-spec-map";

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

  const setIfEmpty = (key: string, value: string) => {
    if (!schemaKeys.has(key) || out[key]?.trim()) return;
    const v = value.trim();
    if (v) out[key] = v;
  };

  const processorText =
    displayByKey.processor_full?.trim() ||
    displayByKey.processor?.trim() ||
    displayByKey.processor_family?.trim() ||
    displayByKey.cpu?.trim() ||
    "";
  if (processorText) {
    setIfEmpty("processor_family", facetValueForFilter("processor_family", processorText) ?? normalizeFilterValue("processor_family", processorText));
    if (/Intel/i.test(processorText)) setIfEmpty("processor_brand", "Intel");
    if (/AMD/i.test(processorText)) setIfEmpty("processor_brand", "AMD");
    if (/Apple/i.test(processorText)) setIfEmpty("processor_brand", "Apple");
    const model = processorText.match(/i[3579]-\d{4,5}[A-Z]{0,3}/i) ?? processorText.match(/Ryzen\s*\d+\s*\d{4}/i);
    if (model) setIfEmpty("processor_model", model[0].replace(/\s+/g, " ").trim());
  }

  const ramText = displayByKey.ram_display?.trim() || displayByKey.ram?.trim() || displayByKey.ram_size?.trim() || "";
  if (ramText) {
    setIfEmpty("ram_size", normalizeFilterValue("ram_size", ramText));
    const ddr = ramText.match(/DDR\d/i);
    if (ddr) setIfEmpty("ram_type", ddr[0].toUpperCase());
  }

  const storageText =
    displayByKey.storage_display?.trim() || displayByKey.storage?.trim() || displayByKey.storage_size?.trim() || "";
  if (storageText) {
    setIfEmpty("storage_size", normalizeFilterValue("storage_size", storageText));
    if (/ssd/i.test(storageText)) setIfEmpty("storage_type", "SSD");
    else if (/hdd/i.test(storageText)) setIfEmpty("storage_type", "HDD");
    if (/nvme/i.test(storageText)) setIfEmpty("storage_interface", "NVMe");
  }

  const gpuText = displayByKey.gpu_full?.trim() || displayByKey.gpu?.trim() || displayByKey.gpu_model?.trim() || "";
  if (gpuText) {
    setIfEmpty("gpu_model", facetValueForFilter("gpu_model", gpuText) ?? normalizeFilterValue("gpu_model", gpuText));
    const vram = gpuText.match(/(\d+)\s*GB\s*GDDR/i) ?? gpuText.match(/(\d+)\s*GB/i);
    if (vram) setIfEmpty("gpu_vram", vram[1]);
  }

  const screenText = displayByKey.screen_size?.trim() || displayByKey.screen?.trim() || "";
  if (screenText) {
    setIfEmpty("screen_size", normalizeFilterValue("screen_size", screenText));
  }

  const weightText = displayByKey.weight?.trim() || "";
  if (weightText) {
    setIfEmpty("weight", normalizeFilterValue("weight", weightText));
  }

  return out;
}
