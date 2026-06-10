import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PROVINCE_FEE,
  resolveShippingFee,
  resolveShippingFeeMap,
  sanitizeShippingFeesJson,
} from "./shipping-fees";
import { IRAQ_PROVINCES } from "./iraq-provinces";

const CONFIG = {
  standardShippingFee: 8000,
  freeDeliveryThreshold: 100000,
  shippingFeesJson: { baghdad: 5000, basra: 9000 },
};

// --- sanitizeShippingFeesJson ---

test("sanitize keeps valid known-code entries", () => {
  assert.deepEqual(sanitizeShippingFeesJson({ baghdad: 5000, erbil: 0 }), { baghdad: 5000, erbil: 0 });
});

test("sanitize normalizes non-canonical province keys", () => {
  // English name, Arabic name and alias all fold to canonical codes
  assert.deepEqual(sanitizeShippingFeesJson({ Baghdad: 5000, البصرة: 7000, Mosul: 9000 }), {
    baghdad: 5000,
    basra: 7000,
    nineveh: 9000,
  });
});

test("sanitize drops unknown keys and invalid fees", () => {
  assert.deepEqual(
    sanitizeShippingFeesJson({
      atlantis: 5000, // unknown province
      baghdad: -1, // negative
      basra: 2500.5, // not an integer
      erbil: MAX_PROVINCE_FEE + 1, // above cap
      najaf: "7000", // wrong type
      karbala: 7000, // valid
    }),
    { karbala: 7000 },
  );
});

test("sanitize tolerates non-object inputs", () => {
  for (const raw of [null, undefined, "x", 7, true, [1, 2]]) {
    assert.deepEqual(sanitizeShippingFeesJson(raw), {});
  }
});

// --- resolveShippingFeeMap ---

test("map covers all 18 provinces with overrides applied and flat fallback elsewhere", () => {
  const map = resolveShippingFeeMap(CONFIG);
  assert.equal(Object.keys(map).length, 18);
  assert.equal(map.baghdad, 5000);
  assert.equal(map.basra, 9000);
  for (const p of IRAQ_PROVINCES) {
    if (p.code !== "baghdad" && p.code !== "basra") {
      assert.equal(map[p.code], 8000, `${p.code} should fall back to standard fee`);
    }
  }
});

test("map falls back to defaults when config fields are missing", () => {
  const map = resolveShippingFeeMap({});
  assert.equal(Object.keys(map).length, 18);
  for (const p of IRAQ_PROVINCES) assert.equal(map[p.code], 5000);
});

// --- resolveShippingFee ---

test("pickup is always free", () => {
  assert.equal(resolveShippingFee("baghdad", 1000, CONFIG, { pickup: true }), 0);
  assert.equal(resolveShippingFee(null, 0, CONFIG, { pickup: true }), 0);
});

test("free over the threshold (inclusive)", () => {
  assert.equal(resolveShippingFee("baghdad", 100000, CONFIG), 0);
  assert.equal(resolveShippingFee("basra", 250000, CONFIG), 0);
});

test("per-province override under the threshold", () => {
  assert.equal(resolveShippingFee("baghdad", 99999, CONFIG), 5000);
  assert.equal(resolveShippingFee("basra", 50000, CONFIG), 9000);
});

test("unmapped province falls back to the flat fee", () => {
  assert.equal(resolveShippingFee("erbil", 50000, CONFIG), 8000);
  assert.equal(resolveShippingFee("duhok", 50000, CONFIG), 8000);
});

test("province input accepts codes, English/Arabic names and aliases", () => {
  assert.equal(resolveShippingFee("Baghdad", 50000, CONFIG), 5000);
  assert.equal(resolveShippingFee("بغداد", 50000, CONFIG), 5000);
  assert.equal(resolveShippingFee("Basrah", 50000, CONFIG), 9000); // alias
  assert.equal(resolveShippingFee("البصرة", 50000, CONFIG), 9000);
});

test("unrecognized or empty destination falls back to the flat fee", () => {
  assert.equal(resolveShippingFee("atlantis", 50000, CONFIG), 8000);
  assert.equal(resolveShippingFee("", 50000, CONFIG), 8000);
  assert.equal(resolveShippingFee(null, 50000, CONFIG), 8000);
  assert.equal(resolveShippingFee(undefined, 50000, CONFIG), 8000);
});

test("missing/invalid config fields fall back to storefront defaults (5000 / 100000)", () => {
  assert.equal(resolveShippingFee("baghdad", 50000, {}), 5000);
  assert.equal(resolveShippingFee("baghdad", 100000, {}), 0);
  assert.equal(resolveShippingFee("baghdad", 50000, { standardShippingFee: null, freeDeliveryThreshold: null }), 5000);
  // NaN threshold must not poison the comparison
  assert.equal(resolveShippingFee("baghdad", 50000, { freeDeliveryThreshold: Number.NaN }), 5000);
});

test("zero fee override is honored (free delivery city)", () => {
  const cfg = { ...CONFIG, shippingFeesJson: { baghdad: 0 } };
  assert.equal(resolveShippingFee("baghdad", 50000, cfg), 0);
  assert.equal(resolveShippingFee("basra", 50000, cfg), 8000);
});
