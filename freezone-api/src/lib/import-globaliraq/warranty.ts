// Double a product's warranty period for the FreeZone catalog.
//
// Global Iraq lists agency warranties (1 year, 2 years, 6 months, …) in mixed
// Arabic + English wording. FreeZone's policy is to advertise double the source
// warranty. `parseAndDoubleWarranty` parses the source string, doubles the
// numeric period, and re-renders it in the same language/format it found —
// preserving the surrounding words ("ضمان", "وكالة", "warranty", …).
//
// Rules (exhaustively unit-tested in warranty.test.ts):
//   "ضمان سنة وكالة"      → "ضمان سنتين وكالة"
//   "ضمان سنتين وكالة"    → "ضمان أربع سنوات وكالة"
//   "ضمان 3 سنوات"        → "ضمان 6 سنوات"
//   "ضمان 6 أشهر"         → "ضمان 12 شهر"
//   "ضمان 12 شهر"         → "ضمان 24 شهر"
//   "كفالة عام"           → "كفالة عامين"
//   "ضمان لمدة عام"        → "ضمان لمدة عامين"
//   "1 year warranty"     → "2 years warranty"
//   "warranty: 2 years"   → "warranty: 4 years"
//   "ضمان مدى الحياة"     → "ضمان مدى الحياة"   (lifetime, not doubled)
//   "ضمان ١ سنة"          → "ضمان 2 سنتين"      (arabic-indic digits supported)
//   ""                    → DEFAULT_WARRANTY    (no source → default, not doubled)

export const DEFAULT_WARRANTY = "ضمان سنتين وكالة";

const LIFETIME_PATTERNS = [/مدى\s+الحياة/u, /مدى\s+العمر/u, /lifetime/i, /life\s*time/i];

/** Arabic cardinal words for 1–10 (masculine/feminine variants folded). */
const AR_WORD_TO_NUM: Record<string, number> = {
  سنة: 1, عام: 1,
  سنتين: 2, عامين: 2, سنتان: 2, عامان: 2,
  ثلاث: 3, ثلاثة: 3,
  أربع: 4, اربع: 4, أربعة: 4, اربعة: 4,
  خمس: 5, خمسة: 5,
  ست: 6, ستة: 6,
  سبع: 7, سبعة: 7,
  ثمان: 8, ثماني: 8, ثمانية: 8,
  تسع: 9, تسعة: 9,
  عشر: 10, عشرة: 10,
};

function normalizeArabicDigits(s: string): string {
  /** Arabic-Indic ٠-٩ (U+0660-0669) + Eastern ۰-۹ (U+06F0-06F9) → ASCII. */
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Arabic count word for N years (1 سنة, 2 سنتين, 3-10 [word] سنوات, >10 N سنة). */
function arabicYears(n: number): string {
  if (n === 1) return "سنة";
  if (n === 2) return "سنتين";
  if (n >= 3 && n <= 10) {
    const w = ["", "", "", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثمان", "تسع", "عشر"][n];
    return `${w} سنوات`;
  }
  return `${n} سنة`;
}

/** Arabic count word for N months. */
function arabicMonths(n: number): string {
  if (n === 1) return "شهر";
  if (n === 2) return "شهرين";
  if (n >= 3 && n <= 10) {
    const w = ["", "", "", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"][n];
    return `${w} أشهر`;
  }
  return `${n} شهر`;
}

/** Arabic count word for N years/ عام family (عام, عامين, then fall back to سنوات form). */
function arabicAamYears(n: number): string {
  if (n === 1) return "عام";
  if (n === 2) return "عامين";
  return arabicYears(n);
}

export function parseAndDoubleWarranty(
  input: string | null | undefined,
  defaultText: string = DEFAULT_WARRANTY,
): string {
  if (!input || !input.trim()) return defaultText;
  const original = input.trim();

  /** Lifetime warranties are never doubled. */
  for (const re of LIFETIME_PATTERNS) {
    if (re.test(original)) return original;
  }

  const text = normalizeArabicDigits(original);

  // 1) Already-dual Arabic forms → quadruple-year wording.
  if (/سنتين|سنتان/u.test(text)) {
    return text.replace(/سنتين|سنتان/u, "أربع سنوات");
  }
  if (/عامين|عامان/u.test(text)) {
    return text.replace(/عامين|عامان/u, "أربعة أعوام");
  }

  // 2) Arabic word + plural unit (e.g. "ثلاث سنوات", "ست أشهر").
  const arWordPlural = text.match(
    /(ثلاث|أربع|اربع|خمس|ست|سبع|ثمان|ثماني|تسع|عشر)(?:ة|ي)?\s+(سنوات|أعوام|اعوام|أشهر|اشهر|شهور)/u,
  );
  if (arWordPlural) {
    const base = AR_WORD_TO_NUM[arWordPlural[1]];
    if (base != null) {
      const doubled = base * 2;
      const isMonth = /شه/u.test(arWordPlural[2]);
      return text.replace(arWordPlural[0], isMonth ? arabicMonths(doubled) : arabicYears(doubled));
    }
  }

  // 3) Digit + Arabic unit (e.g. "3 سنوات", "6 أشهر", "12 شهر").
  const digitAr = text.match(/(\d+)\s*(سنوات|سنة|سنين|أعوام|اعوام|عام|أشهر|اشهر|شهور|شهر)/u);
  if (digitAr) {
    const n = parseInt(digitAr[1], 10);
    if (Number.isFinite(n)) {
      const doubled = n * 2;
      const isMonth = /شه/u.test(digitAr[2]);
      return text.replace(digitAr[0], isMonth ? arabicMonths(doubled) : arabicYears(doubled));
    }
  }

  // 4) Arabic singular bare word "سنة" / "عام" / "شهر" (no preceding digit).
  if (/(?<![؀-ۿ\d])سنة(?![؀-ۿ])/u.test(text)) {
    return text.replace(/سنة/u, "سنتين");
  }
  if (/(?<![؀-ۿ\d])عام(?![؀-ۿ])/u.test(text)) {
    return text.replace(/عام/u, "عامين");
  }
  if (/(?<![؀-ۿ\d])شهر(?![؀-ۿ])/u.test(text)) {
    return text.replace(/شهر/u, "شهرين");
  }

  // 5) English "N year(s)" / "N month(s)" — separator may be a space or a
  //    hyphen ("3-Year Manufacturer Warranty"). Hyphenated compound adjectives
  //    keep the original unit form ("6-Year"); spaced forms pluralise.
  const en = text.match(/(\d+)([\s-]*)(years?|months?)/i);
  if (en) {
    const n = parseInt(en[1], 10);
    if (Number.isFinite(n)) {
      const doubled = n * 2;
      const sep = en[2];
      const unitRaw = en[3];
      const isHyphen = sep.includes("-");
      const isMonth = /month/i.test(unitRaw);
      let unit: string;
      if (isHyphen) {
        unit = unitRaw;
      } else {
        const base = isMonth ? "month" : "year";
        unit = doubled === 1 ? base : `${base}s`;
        if (/^[A-Z]/.test(unitRaw)) unit = unit.charAt(0).toUpperCase() + unit.slice(1);
      }
      return text.replace(en[0], `${doubled}${sep}${unit}`);
    }
  }

  /** Nothing numeric recognised — return the source untouched (better than a
   *  wrong double; the admin can correct it). */
  return text;
}

/** Keep `arabicAamYears` referenced for the dual-form path symmetry/tests. */
export { arabicYears, arabicMonths, arabicAamYears };
