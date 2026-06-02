#!/usr/bin/env node
/**
 * Static count of product editor tabs (Law 2 — COUNT before CLAIM).
 * Run: node scripts/verify-product-editor-tabs.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(root, "../src/components/admin/products/editor/ProductEditorWorkspace.tsx"),
  "utf8",
);

const EXPECTED = [
  "basic",
  "description",
  "images",
  "pricing",
  "inventory",
  "attributes",
  "variants",
  "seo",
  "shipping",
  "notes",
];

const found = [...src.matchAll(/\{\s*id:\s*"(basic|description|images|pricing|inventory|attributes|variants|seo|shipping|notes)"/g)].map(
  (m) => m[1],
);
const unique = [...new Set(found)];

console.log("Product editor tabs (unique):", unique.length);
console.log(unique.join(", "));
if (unique.length !== 10) {
  console.error("EXPECTED 10 tabs, got", unique.length);
  process.exit(1);
}
for (const id of EXPECTED) {
  if (!unique.includes(id)) {
    console.error("Missing tab:", id);
    process.exit(1);
  }
}
if (!src.includes("data-tab={t.id}") || !src.includes("data-tabs-count={TABS.length}")) {
  console.error("EXPECTED data-tab and data-tabs-count on tab nav");
  process.exit(1);
}
console.log("OK: 10 tabs with data-tab attributes");
