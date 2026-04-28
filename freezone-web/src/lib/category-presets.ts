/**
 * قالب مستوحى من فلاتر مجموعات اللابتوب (RAM، التخزين، GPU، المعالج، إلخ).
 * يمكن لصقه في حقل facetKeys أو استخدام زر "قالب لابتوب" في لوحة التصنيفات.
 */
export const LAPTOP_STYLE_FACET_KEYS = [
  "cpu",
  "ram",
  "storage",
  "storageType",
  "screen",
  "screenSize",
  "gpu",
  "vram",
  "resolution",
  "touchscreen",
  "os",
] as const;

export const LAPTOP_STYLE_FACET_KEYS_JSON = JSON.stringify([...LAPTOP_STYLE_FACET_KEYS], null, 2);
