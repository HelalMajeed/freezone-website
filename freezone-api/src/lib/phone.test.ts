import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeIraqiPhone, isValidIraqiPhone } from "./phone";

// --- normalizeIraqiPhone: folding to canonical 07XXXXXXXXX ---

const NORMALIZE_CASES: Array<[string, string]> = [
  // already canonical
  ["07712345678", "07712345678"],
  // separators
  ["0771 234 5678", "07712345678"],
  ["0771-234-5678", "07712345678"],
  ["(0771) 234 5678", "07712345678"],
  // international prefixes
  ["+9647712345678", "07712345678"],
  ["+964 771 234 5678", "07712345678"],
  ["009647712345678", "07712345678"],
  ["9647712345678", "07712345678"],
  // Arabic-indic digits (٠١٢…)
  ["٠٧٧١٢٣٤٥٦٧٨", "07712345678"],
  // Persian / Kurdish keyboard digits (۰۱۲…)
  ["۰۷۷۱۲۳۴۵۶۷۸", "07712345678"],
  // Arabic digits + international prefix + spaces
  ["+٩٦٤ ٧٧١ ٢٣٤ ٥٦٧٨", "07712345678"],
];

for (const [input, expected] of NORMALIZE_CASES) {
  test(`normalizeIraqiPhone(${JSON.stringify(input)}) -> ${expected}`, () => {
    assert.equal(normalizeIraqiPhone(input), expected);
  });
}

test("the international prefix is only folded at the start", () => {
  // "964" in the middle of a number must survive untouched
  assert.equal(normalizeIraqiPhone("07719641234"), "07719641234");
});

// --- isValidIraqiPhone ---

for (const [input] of NORMALIZE_CASES) {
  test(`isValidIraqiPhone(${JSON.stringify(input)}) -> true`, () => {
    assert.equal(isValidIraqiPhone(input), true);
  });
}

const INVALID_CASES: string[] = [
  "", // empty
  "   ", // whitespace only
  "0771234567", // 10 digits — one short
  "077123456789", // 12 digits — one long
  "7712345678", // missing leading 0
  "06712345678", // not a mobile prefix
  "08712345678", // not a mobile prefix
  "077a2345678", // letters
  "+9617712345678", // Lebanon country code
  "771-234-5678", // no prefix at all
];

for (const input of INVALID_CASES) {
  test(`isValidIraqiPhone(${JSON.stringify(input)}) -> false`, () => {
    assert.equal(isValidIraqiPhone(input), false);
  });
}
