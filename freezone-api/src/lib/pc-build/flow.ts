import type { PcBuildSelections } from "./types";

/** ترتيب الخطوات الأساسي في الواجهة (يتوافق مع المحرك) */
export const ENGINE_CORE_ORDER = [
  "cpu",
  "gpu",
  "mb",
  "ram",
  "storage",
  "psu",
  "case",
  "cooling",
] as const;

export type EngineCoreKey = (typeof ENGINE_CORE_ORDER)[number];

export function isCoreStepUnlocked(key: EngineCoreKey, s: PcBuildSelections): boolean {
  const idx = ENGINE_CORE_ORDER.indexOf(key);
  if (idx <= 0) return true;
  const prev = ENGINE_CORE_ORDER[idx - 1];
  switch (prev) {
    case "cpu":
      return s.cpu != null;
    case "gpu":
      return s.gpu != null;
    case "mb":
      return s.motherboard != null;
    case "ram":
      return s.ramKits.length > 0;
    case "storage":
      return s.ramKits.length > 0;
    case "psu":
      return s.ramKits.length > 0;
    case "case":
      return s.pcCase != null;
    default:
      return false;
  }
}

/** تصفير من خطوة معيّنة حتى النهاية (عند إزالة قطعة) */
export function cascadeClearFrom(s: PcBuildSelections, fromKey: EngineCoreKey): PcBuildSelections {
  const i = ENGINE_CORE_ORDER.indexOf(fromKey);
  const n: PcBuildSelections = {
    ...s,
    ramKits: [...s.ramKits],
    storage: [...s.storage],
  };
  for (let j = i; j < ENGINE_CORE_ORDER.length; j++) {
    const k = ENGINE_CORE_ORDER[j];
    switch (k) {
      case "cpu":
        n.cpu = null;
        break;
      case "gpu":
        n.gpu = null;
        break;
      case "mb":
        n.motherboard = null;
        break;
      case "ram":
        n.ramKits = [];
        break;
      case "storage":
        n.storage = [];
        break;
      case "psu":
        n.psu = null;
        break;
      case "case":
        n.pcCase = null;
        break;
      case "cooling":
        n.cooling = null;
        break;
    }
  }
  return n;
}
