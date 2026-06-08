/**
 * Canonical list of Iraq's 18 governorates for storefront + dashboard UI.
 *
 * Mirror of the API source of truth in
 * `freezone-api/src/lib/iraq-provinces.ts` — the `code` values MUST stay
 * identical across both copies. The checkout dropdown submits these codes as
 * `customer.city`, and the product editor stores them in
 * `Product.excludedProvinces`, so both sides speak one vocabulary that the API
 * enforces. Labels here are display-only.
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

export interface ProvinceOption {
  code: ProvinceCode;
  ar: string;
  en: string;
}

/** Ordered roughly by population/commercial weight, then KRG governorates. */
export const IRAQ_PROVINCES: readonly ProvinceOption[] = [
  { code: "baghdad", ar: "بغداد", en: "Baghdad" },
  { code: "basra", ar: "البصرة", en: "Basra" },
  { code: "nineveh", ar: "نينوى (الموصل)", en: "Nineveh (Mosul)" },
  { code: "erbil", ar: "أربيل", en: "Erbil" },
  { code: "kirkuk", ar: "كركوك", en: "Kirkuk" },
  { code: "najaf", ar: "النجف", en: "Najaf" },
  { code: "karbala", ar: "كربلاء", en: "Karbala" },
  { code: "wasit", ar: "واسط", en: "Wasit" },
  { code: "babil", ar: "بابل", en: "Babil" },
  { code: "diyala", ar: "ديالى", en: "Diyala" },
  { code: "dhiqar", ar: "ذي قار", en: "Dhi Qar" },
  { code: "maysan", ar: "ميسان", en: "Maysan" },
  { code: "muthanna", ar: "المثنى", en: "Muthanna" },
  { code: "qadisiyyah", ar: "القادسية", en: "Qadisiyyah" },
  { code: "anbar", ar: "الأنبار", en: "Anbar" },
  { code: "saladin", ar: "صلاح الدين", en: "Saladin" },
  { code: "sulaymaniyah", ar: "السليمانية", en: "Sulaymaniyah" },
  { code: "duhok", ar: "دهوك", en: "Duhok" },
] as const;

/** Bilingual label, Arabic first, for a province option. */
export function provinceLabel(p: ProvinceOption): string {
  return `${p.ar} / ${p.en}`;
}

/**
 * Fold a label to a comparison key (mirror of the API's `fold`): lowercase,
 * strip Arabic diacritics, unify alef/ya/ta-marbuta, drop the "ال" article.
 */
function fold(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/^ال/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A handful of legacy/alias spellings the dashboard may have stored before the
 * canonical codes existed, so re-opening an old product pre-selects the right
 * province instead of silently dropping it. The codes/ar/en forms above are
 * registered automatically; this only covers extras.
 */
const ALIASES: Record<string, ProvinceCode> = {
  mosul: "nineveh",
  الموصل: "nineveh",
  basrah: "basra",
  arbil: "erbil",
  hawler: "erbil",
  diwaniyah: "qadisiyyah",
  tikrit: "saladin",
  nasiriyah: "dhiqar",
  ramadi: "anbar",
  dohuk: "duhok",
};

const KEY_TO_CODE: ReadonlyMap<string, ProvinceCode> = (() => {
  const map = new Map<string, ProvinceCode>();
  for (const p of IRAQ_PROVINCES) {
    for (const label of [p.code, p.en, p.ar]) {
      const key = fold(label);
      if (key && !map.has(key)) map.set(key, p.code);
    }
  }
  for (const [label, code] of Object.entries(ALIASES)) {
    const key = fold(label);
    if (key && !map.has(key)) map.set(key, code);
  }
  return map;
})();

/** Resolve any code/name/alias to a canonical `ProvinceCode`, or `null`. */
export function normalizeProvince(input: string | null | undefined): ProvinceCode | null {
  if (!input) return null;
  return KEY_TO_CODE.get(fold(input)) ?? null;
}
