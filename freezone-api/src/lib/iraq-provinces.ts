/**
 * Canonical taxonomy of Iraq's 18 governorates ("provinces").
 *
 * This module is the single source of truth the API uses to reconcile three
 * historically-divergent vocabularies (see docs/NEXT_SESSION_HANDOFF.md M1):
 *   - the storefront checkout dropdown, which submits English city values;
 *   - `Product.excludedProvinces`, a free-text admin field that historically
 *     held Arabic names typed one-per-line;
 *   - stored `Order.city` values, echoes of the dropdown.
 *
 * `normalizeProvince()` folds any of those forms (code, English name, Arabic
 * name with or without the "ال" article, or a known alias / capital-city name)
 * down to a single stable `ProvinceCode`, so a delivery restriction declared in
 * one vocabulary is enforced against an order placed in another.
 *
 * A mirror of this list (codes + labels only) lives in
 * `freezone-web/src/lib/iraq-provinces.ts` for the checkout dropdown and the
 * dashboard editor. Keep the `code` values identical across both copies.
 */

export type ProvinceCode =
  | "baghdad"
  | "basra"
  | "nineveh"
  | "erbil"
  | "kirkuk"
  | "najaf"
  | "karbala"
  | "wasit"
  | "babil"
  | "diyala"
  | "dhiqar"
  | "maysan"
  | "muthanna"
  | "qadisiyyah"
  | "anbar"
  | "saladin"
  | "sulaymaniyah"
  | "duhok";

export interface Province {
  code: ProvinceCode;
  ar: string;
  en: string;
  /** Extra spellings/transliterations and capital-city names that resolve here. */
  aliases: string[];
}

export const IRAQ_PROVINCES: readonly Province[] = [
  { code: "baghdad", ar: "بغداد", en: "Baghdad", aliases: [] },
  { code: "basra", ar: "البصرة", en: "Basra", aliases: ["Basrah", "Al Basrah"] },
  { code: "nineveh", ar: "نينوى", en: "Nineveh", aliases: ["Ninawa", "Mosul", "الموصل"] },
  { code: "erbil", ar: "أربيل", en: "Erbil", aliases: ["Arbil", "Hawler", "هولير"] },
  { code: "kirkuk", ar: "كركوك", en: "Kirkuk", aliases: [] },
  { code: "najaf", ar: "النجف", en: "Najaf", aliases: ["An Najaf"] },
  { code: "karbala", ar: "كربلاء", en: "Karbala", aliases: ["Kerbala", "Karbala'"] },
  { code: "wasit", ar: "واسط", en: "Wasit", aliases: ["Kut", "Al Kut", "الكوت"] },
  { code: "babil", ar: "بابل", en: "Babil", aliases: ["Babylon", "Hillah", "Hilla", "الحلة"] },
  { code: "diyala", ar: "ديالى", en: "Diyala", aliases: ["Baquba", "بعقوبة"] },
  { code: "dhiqar", ar: "ذي قار", en: "Dhi Qar", aliases: ["Dhiqar", "Thi Qar", "Nasiriyah", "الناصرية"] },
  { code: "maysan", ar: "ميسان", en: "Maysan", aliases: ["Missan", "Amarah", "العمارة"] },
  { code: "muthanna", ar: "المثنى", en: "Muthanna", aliases: ["Al Muthanna", "Samawah", "السماوة"] },
  { code: "qadisiyyah", ar: "القادسية", en: "Qadisiyyah", aliases: ["Al Qadisiyyah", "Diwaniyah", "Diwaniya", "الديوانية"] },
  { code: "anbar", ar: "الأنبار", en: "Anbar", aliases: ["Al Anbar", "Ramadi", "الرمادي"] },
  { code: "saladin", ar: "صلاح الدين", en: "Saladin", aliases: ["Salah al-Din", "Salahuddin", "Salah ad Din", "Tikrit", "تكريت"] },
  { code: "sulaymaniyah", ar: "السليمانية", en: "Sulaymaniyah", aliases: ["Sulaimaniyah", "Slemani", "Suleimaniya"] },
  { code: "duhok", ar: "دهوك", en: "Duhok", aliases: ["Dohuk", "Dahuk"] },
] as const;

/**
 * Fold a label to a comparison key: lowercase, strip Arabic diacritics, unify
 * alef/ya/ta-marbuta variants, drop the leading "ال" article, and collapse
 * whitespace and separators. Latin and Arabic forms each fold predictably so a
 * single key space can hold both.
 */
function fold(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "") // Arabic diacritics / superscript alef
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/^ال/, "") // definite article, e.g. البصرة -> بصره
    .replace(/[-ّ_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reverse lookup: folded key -> canonical code. Built once at module load. */
const KEY_TO_CODE: ReadonlyMap<string, ProvinceCode> = (() => {
  const map = new Map<string, ProvinceCode>();
  for (const p of IRAQ_PROVINCES) {
    for (const label of [p.code, p.en, p.ar, ...p.aliases]) {
      const key = fold(label);
      if (key && !map.has(key)) map.set(key, p.code);
    }
  }
  return map;
})();

/**
 * Resolve an arbitrary city/province string to its canonical `ProvinceCode`,
 * or `null` when the input is empty or doesn't match any known province.
 * Accepts codes, English names, Arabic names (with/without "ال"), and the
 * aliases/capital-city names listed above.
 */
export function normalizeProvince(input: string | null | undefined): ProvinceCode | null {
  if (!input) return null;
  return KEY_TO_CODE.get(fold(input)) ?? null;
}

/**
 * Coerce a stored `Product.excludedProvinces` value (Prisma `Json?`, in
 * practice a `string[]`) into the set of canonical codes it forbids delivery
 * to. Unrecognized entries are dropped rather than throwing, so a stray legacy
 * value never blocks the whole catalog.
 */
export function excludedProvinceCodes(excluded: unknown): Set<ProvinceCode> {
  const out = new Set<ProvinceCode>();
  if (!Array.isArray(excluded)) return out;
  for (const entry of excluded) {
    if (typeof entry !== "string") continue;
    const code = normalizeProvince(entry);
    if (code) out.add(code);
  }
  return out;
}

/**
 * True when a product cannot be delivered to the given destination. Returns
 * `false` for an empty exclusion list or an unrecognized destination (fail-open:
 * only a positively-matched province blocks the order).
 */
export function isProvinceExcluded(excluded: unknown, destination: string | null | undefined): boolean {
  const code = normalizeProvince(destination);
  if (!code) return false;
  return excludedProvinceCodes(excluded).has(code);
}
