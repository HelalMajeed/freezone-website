/**
 * Iraqi mobile phone normalization + validation.
 *
 * Mirror of `freezone-api/src/lib/phone.ts` (the server is the source of
 * truth — keep both copies identical). Used for client-side validation of the
 * `07XXXXXXXXX` (11-digit) Iraqi mobile format.
 *
 * `normalizeIraqiPhone()` folds the messy real-world inputs:
 *   - Arabic-indic (٠١٢٣٤٥٦٧٨٩) and Persian/Kurdish (۰۱۲۳۴۵۶۷۸۹) digits → ASCII
 *   - spaces / dashes / parentheses stripped
 *   - international prefixes `+964` / `00964` / `964` → leading `0`
 */

const ARABIC_INDIC_ZERO = 0x0660; // "٠"
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0; // "۰" (Persian / Kurdish keyboards)

/** Convert Arabic-indic and Persian digits to their ASCII equivalents. */
function toAsciiDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= ARABIC_INDIC_ZERO && cp <= ARABIC_INDIC_ZERO + 9) {
      out += String(cp - ARABIC_INDIC_ZERO);
    } else if (cp >= EXTENDED_ARABIC_INDIC_ZERO && cp <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
      out += String(cp - EXTENDED_ARABIC_INDIC_ZERO);
    } else {
      out += ch;
    }
  }
  return out;
}

/** Fold an Iraqi phone number to canonical local form, e.g. `07712345678`. */
export function normalizeIraqiPhone(input: string): string {
  return toAsciiDigits(input)
    .replace(/[\s\-()]/g, "")
    .replace(/^(?:\+964|00964|964)/, "0");
}

/** Whether the input normalizes to a valid Iraqi mobile (`07` + 9 digits). */
export function isValidIraqiPhone(input: string): boolean {
  return /^07\d{9}$/.test(normalizeIraqiPhone(input));
}
