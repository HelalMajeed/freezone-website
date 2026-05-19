/**
 * Map legacy product.specs → ProductAttributeValue with displayValue + normalized filter tokens.
 * Safe to re-run (idempotent per product).
 */
import { PrismaClient } from "@prisma/client";
import { loadCategoryAttributeSchema, saveProductSpecsNormalized } from "../src/lib/classification/persist";
import {
  readLegacyRawDisplay,
  remapLegacySpecsForCategory,
} from "../src/lib/classification/legacy-spec-map";
import { normalizeFilterValue } from "../src/lib/classification/filter-value";
import { deriveFilterFacetsFromDisplay } from "../src/lib/classification/derive-filter-facets";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      categoryId: true,
      specs: true,
      category: { select: { slug: true } },
    },
  });

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const p of products) {
    const specs =
      p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
        ? (p.specs as Record<string, string>)
        : null;
    if (!specs || !Object.keys(specs).length) {
      skip++;
      continue;
    }

    const schema = await loadCategoryAttributeSchema(
      (args) => prisma.categoryAttribute.findMany(args),
      p.categoryId,
    );
    if (!schema.length) {
      skip++;
      continue;
    }

    const remapped = remapLegacySpecsForCategory(
      p.category.slug,
      specs,
      schema.map((a) => a.key),
    );

    const displayByKey: Record<string, string> = {};
    const filterByKey: Record<string, string> = {};

    const cpuLegacy = specs.cpu?.trim() || specs.processor?.trim();
    if (cpuLegacy && p.category.slug === "laptops") {
      if (schema.some((a) => a.key === "processor_full")) displayByKey.processor_full = cpuLegacy;
    }
    const ramLegacy = specs.ram?.trim();
    if (ramLegacy && p.category.slug === "laptops") displayByKey.ram_display = ramLegacy;
    const storageLegacy = specs.storage?.trim();
    if (storageLegacy && p.category.slug === "laptops") displayByKey.storage_display = storageLegacy;
    const gpuLegacy = specs.gpu?.trim();
    if (gpuLegacy && p.category.slug === "laptops") displayByKey.gpu_full = gpuLegacy;

    for (const attr of schema) {
      const rawDisplay = readLegacyRawDisplay(specs, p.category.slug, attr.key) ?? displayByKey[attr.key];
      const normalized =
        remapped[attr.key] ?? (rawDisplay ? normalizeFilterValue(attr.key, rawDisplay) : "");
      if (!rawDisplay && !normalized) continue;
      if (rawDisplay) displayByKey[attr.key] = rawDisplay;
      if (attr.filterable && normalized) filterByKey[attr.key] = normalized;
    }

    const derived = deriveFilterFacetsFromDisplay(schema, displayByKey, filterByKey);
    Object.assign(filterByKey, derived);

    const payload: Record<string, { display: string; filter?: string }> = {};
    const keys = new Set([...Object.keys(displayByKey), ...Object.keys(filterByKey)]);
    for (const key of keys) {
      const display = displayByKey[key]?.trim() ?? "";
      const filter = filterByKey[key]?.trim();
      const attr = schema.find((a) => a.key === key);
      if (!display && !filter) continue;
      if (attr?.filterable) {
        if (!display && !filter) continue;
        payload[key] = { display, ...(filter ? { filter } : {}) };
      } else if (display) {
        payload[key] = display;
      }
    }

    if (!Object.keys(payload).length) {
      skip++;
      continue;
    }

    const schemaRelaxed = schema.map((a) => ({ ...a, options: null }));
    const r = await saveProductSpecsNormalized(prisma, p.id, schemaRelaxed, payload);
    if (!r.ok) {
      console.warn(`product ${p.id} (${p.category.slug}): ${"error" in r ? r.error : "failed"}`);
      fail++;
      continue;
    }
    await prisma.product.update({
      where: { id: p.id },
      data: { specs: r.specs as object },
    });
    console.log(`product ${p.id} (${p.category.slug}): synced ${Object.keys(payload).length} attrs`);
    ok++;
  }

  console.log(`done: ok=${ok} skip=${skip} fail=${fail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
