// Tests for ensureCategoryAttributes — uses an in-memory fake of the Prisma
// surface the function touches.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ensureCategoryAttributes,
  humanize,
  snakeCaseAttributeKey,
  type AttributeStore,
} from "./category-attributes";

function makeStore(initial: Array<{ categoryId: number; key: string; sortOrder: number }> = []): {
  store: AttributeStore;
  rows: typeof initial;
  createCalls: number;
} {
  const rows = [...initial];
  let createCalls = 0;
  const store: AttributeStore = {
    categoryAttribute: {
      findMany: async ({ where }) =>
        rows.filter((r) => r.categoryId === where.categoryId).map((r) => ({ key: r.key })),
      aggregate: async ({ where }) => {
        const my = rows.filter((r) => r.categoryId === where.categoryId);
        const max = my.length ? Math.max(...my.map((r) => r.sortOrder)) : null;
        return { _max: { sortOrder: max } };
      },
      createMany: async ({ data, skipDuplicates }) => {
        createCalls += 1;
        let count = 0;
        for (const d of data) {
          const exists = rows.find(
            (r) => r.categoryId === d.categoryId && r.key === d.key,
          );
          if (exists) {
            if (skipDuplicates) continue;
            throw new Error("duplicate key");
          }
          rows.push({ categoryId: d.categoryId, key: d.key, sortOrder: d.sortOrder });
          count += 1;
        }
        return { count };
      },
    },
  };
  return { store, rows, createCalls: createCalls };
}

test("creates rows for missing keys only", async () => {
  const fixture = makeStore([{ categoryId: 30, key: "warranty", sortOrder: 0 }]);
  const result = await ensureCategoryAttributes(30, ["warranty", "brand_source", "ram"], fixture.store);
  assert.deepEqual(result.reused, ["warranty"]);
  assert.deepEqual(result.created.sort(), ["brand_source", "ram"]);
  assert.deepEqual(
    fixture.rows.map((r) => r.key).sort(),
    ["brand_source", "ram", "warranty"],
  );
});

test("idempotent: second call with same keys creates nothing", async () => {
  const fixture = makeStore();
  await ensureCategoryAttributes(30, ["warranty", "brand_source"], fixture.store);
  const second = await ensureCategoryAttributes(30, ["warranty", "brand_source"], fixture.store);
  assert.deepEqual(second.created, []);
  assert.deepEqual(second.reused.sort(), ["brand_source", "warranty"]);
  assert.equal(fixture.rows.length, 2);
});

test("empty keys list → no work", async () => {
  const fixture = makeStore([{ categoryId: 1, key: "a", sortOrder: 0 }]);
  const result = await ensureCategoryAttributes(1, [], fixture.store);
  assert.deepEqual(result, { reused: [], created: [] });
  assert.equal(fixture.rows.length, 1);
});

test("blank/whitespace keys are ignored", async () => {
  const fixture = makeStore();
  const result = await ensureCategoryAttributes(1, ["  ", "", "ram"], fixture.store);
  assert.deepEqual(result.created, ["ram"]);
});

test("deduplicates keys in the input", async () => {
  const fixture = makeStore();
  await ensureCategoryAttributes(7, ["ram", "ram", "ram"], fixture.store);
  assert.equal(fixture.rows.length, 1);
});

test("sortOrder continues past the existing max", async () => {
  const fixture = makeStore([
    { categoryId: 99, key: "existing_a", sortOrder: 5 },
    { categoryId: 99, key: "existing_b", sortOrder: 6 },
  ]);
  await ensureCategoryAttributes(99, ["new_one", "new_two"], fixture.store);
  const newRows = fixture.rows.filter((r) => r.key.startsWith("new_"));
  assert.equal(newRows[0].sortOrder, 7);
  assert.equal(newRows[1].sortOrder, 8);
});

test("respects categoryId isolation", async () => {
  const fixture = makeStore([{ categoryId: 1, key: "ram", sortOrder: 0 }]);
  const result = await ensureCategoryAttributes(2, ["ram"], fixture.store);
  assert.deepEqual(result.created, ["ram"]);
  assert.equal(fixture.rows.length, 2);
});

test("snakeCaseAttributeKey: camelCase → snake_case", () => {
  assert.equal(snakeCaseAttributeKey("brandSource"), "brand_source");
  assert.equal(snakeCaseAttributeKey("warrantyText"), "warranty_text");
});

test("snakeCaseAttributeKey: kebab-case + spaces → snake_case", () => {
  assert.equal(snakeCaseAttributeKey("disk-type"), "disk_type");
  assert.equal(snakeCaseAttributeKey("disk type main"), "disk_type_main");
  assert.equal(snakeCaseAttributeKey("Display: Full HD"), "display_full_hd");
});

test("snakeCaseAttributeKey: collapses repeated separators + trims", () => {
  assert.equal(snakeCaseAttributeKey("__ram___ddr5__"), "ram_ddr5");
  assert.equal(snakeCaseAttributeKey("  RGB  "), "rgb");
});

test("snakeCaseAttributeKey: prefixes leading digit", () => {
  assert.equal(snakeCaseAttributeKey("2024_model"), "k_2024_model");
  assert.equal(snakeCaseAttributeKey("5g_band"), "k_5g_band");
});

test("snakeCaseAttributeKey: empty / whitespace → empty string", () => {
  assert.equal(snakeCaseAttributeKey(""), "");
  assert.equal(snakeCaseAttributeKey("   "), "");
});

test("ensureCategoryAttributes: normalises camelCase input keys", async () => {
  const fixture = makeStore();
  const result = await ensureCategoryAttributes(
    7,
    ["brandSource", "warrantyText", "disk-type"],
    fixture.store,
  );
  assert.deepEqual(
    result.created.sort(),
    ["brand_source", "disk_type", "warranty_text"],
  );
  assert.deepEqual(
    fixture.rows.map((r) => r.key).sort(),
    ["brand_source", "disk_type", "warranty_text"],
  );
});

test("humanize converts snake_case to Title Case", () => {
  assert.equal(humanize("warranty"), "Warranty");
  assert.equal(humanize("brand_source"), "Brand Source");
  assert.equal(humanize("disk_type_main"), "Disk Type Main");
  assert.equal(humanize("io_ports"), "Io Ports");
  assert.equal(humanize("a"), "A");
  assert.equal(humanize(""), "");
});

test("createMany is only invoked when there's actual work", async () => {
  let calls = 0;
  const store: AttributeStore = {
    categoryAttribute: {
      findMany: async () => [{ key: "ram" }],
      aggregate: async () => ({ _max: { sortOrder: 0 } }),
      createMany: async () => {
        calls += 1;
        return { count: 0 };
      },
    },
  };
  await ensureCategoryAttributes(10, ["ram"], store);
  assert.equal(calls, 0);
  await ensureCategoryAttributes(10, ["ram", "ssd"], store);
  assert.equal(calls, 1);
});
