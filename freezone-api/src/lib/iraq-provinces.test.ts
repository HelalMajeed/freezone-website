import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IRAQ_PROVINCES,
  normalizeProvince,
  excludedProvinceCodes,
  isProvinceExcluded,
} from "./iraq-provinces";

// --- taxonomy shape ---

test("there are exactly 18 governorates with unique codes", () => {
  assert.equal(IRAQ_PROVINCES.length, 18);
  const codes = new Set(IRAQ_PROVINCES.map((p) => p.code));
  assert.equal(codes.size, 18);
});

test("every code round-trips through normalizeProvince", () => {
  for (const p of IRAQ_PROVINCES) {
    assert.equal(normalizeProvince(p.code), p.code, `code ${p.code}`);
    assert.equal(normalizeProvince(p.en), p.code, `en ${p.en}`);
    assert.equal(normalizeProvince(p.ar), p.code, `ar ${p.ar}`);
  }
});

// --- normalizeProvince: cross-vocabulary folding ---

const CASES: Array<[string, string]> = [
  // English dropdown value -> code
  ["Baghdad", "baghdad"],
  ["Basra", "basra"],
  ["Mosul", "nineveh"], // dropdown historically used the capital city name
  ["Erbil", "erbil"],
  // Arabic name with the definite article
  ["البصرة", "basra"],
  ["الموصل", "nineveh"],
  ["النجف", "najaf"],
  // Arabic without the article / alternate spelling
  ["بصرة", "basra"],
  ["اربيل", "erbil"], // plain alef instead of أ
  // capital-city aliases
  ["Diwaniyah", "qadisiyyah"],
  ["Tikrit", "saladin"],
  ["Nasiriyah", "dhiqar"],
  // case / whitespace tolerance
  ["  baGHdad ", "baghdad"],
  ["Salah al-Din", "saladin"],
];

for (const [input, expected] of CASES) {
  test(`normalizeProvince(${JSON.stringify(input)}) -> ${expected}`, () => {
    assert.equal(normalizeProvince(input), expected);
  });
}

test("unknown / empty input normalizes to null", () => {
  assert.equal(normalizeProvince(""), null);
  assert.equal(normalizeProvince(null), null);
  assert.equal(normalizeProvince(undefined), null);
  assert.equal(normalizeProvince("Atlantis"), null);
  assert.equal(normalizeProvince("—"), null);
});

// --- excludedProvinceCodes ---

test("excludedProvinceCodes folds a mixed-vocabulary list", () => {
  const codes = excludedProvinceCodes(["البصرة", "Erbil", "nineveh", "garbage"]);
  assert.deepEqual([...codes].sort(), ["basra", "erbil", "nineveh"]);
});

test("excludedProvinceCodes tolerates non-array / non-string entries", () => {
  assert.equal(excludedProvinceCodes(null).size, 0);
  assert.equal(excludedProvinceCodes(undefined).size, 0);
  assert.equal(excludedProvinceCodes("بغداد").size, 0); // not an array
  assert.deepEqual([...excludedProvinceCodes(["بغداد", 5, null, "Basra"])].sort(), [
    "baghdad",
    "basra",
  ]);
});

// --- isProvinceExcluded: the checkout gate ---

test("blocks when destination matches an excluded entry across vocabularies", () => {
  // admin typed Arabic; buyer's dropdown sent English -> still blocked
  assert.equal(isProvinceExcluded(["البصرة"], "Basra"), true);
  // admin typed English; buyer sent Arabic
  assert.equal(isProvinceExcluded(["Erbil"], "أربيل"), true);
  // capital-city alias on the order side
  assert.equal(isProvinceExcluded(["nineveh"], "Mosul"), true);
});

test("allows when destination is not on the list", () => {
  assert.equal(isProvinceExcluded(["البصرة"], "Baghdad"), false);
  assert.equal(isProvinceExcluded([], "Baghdad"), false);
  assert.equal(isProvinceExcluded(null, "Baghdad"), false);
});

test("fail-open on an unrecognized destination", () => {
  // can't positively place the order in an excluded province -> don't block
  assert.equal(isProvinceExcluded(["البصرة"], "Atlantis"), false);
  assert.equal(isProvinceExcluded(["البصرة"], "—"), false);
  assert.equal(isProvinceExcluded(["البصرة"], ""), false);
});
