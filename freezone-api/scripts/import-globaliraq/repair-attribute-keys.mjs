#!/usr/bin/env node
// One-off repair: delete CategoryAttribute rows whose `key` does not match
// `/^[a-z][a-z0-9_]*$/` and which have ZERO ProductAttributeValue rows
// referencing them. A camelCase or hyphenated key in the schema poisons
// `validateProductSpecsAgainstSchema` for the entire category, so we
// eliminate the dead ones before the next batch.
//
// Safety:
//   * Only deletes rows with zero ProductAttributeValue references.
//   * Prints every row it considers + its fate. No silent skips.
//   * Exits non-zero if any unsafe row is found so the operator can act.
//
// Usage on the live machine:
//   node scripts/import-globaliraq/repair-attribute-keys.mjs
//   node scripts/import-globaliraq/repair-attribute-keys.mjs --dry-run

import { PrismaClient } from "@prisma/client";

const SNAKE = /^[a-z][a-z0-9_]*$/;
const dryRun = process.argv.includes("--dry-run");

const prisma = new PrismaClient();
try {
  const bad = await prisma.categoryAttribute.findMany({
    where: { NOT: { key: { mode: "default" } } },
    select: { id: true, key: true, categoryId: true, nameEn: true },
    orderBy: { id: "asc" },
  });
  const offenders = bad.filter((row) => !SNAKE.test(row.key));
  if (offenders.length === 0) {
    console.log("[repair] no offending CategoryAttribute keys — nothing to do");
    return;
  }
  console.log(`[repair] found ${offenders.length} key(s) not in snake_case:`);
  let deleted = 0;
  let blocked = 0;
  for (const row of offenders) {
    const refs = await prisma.productAttributeValue.count({ where: { attributeKey: row.key } });
    if (refs > 0) {
      console.log(`  ❌ id=${row.id} key="${row.key}" categoryId=${row.categoryId} — ${refs} ProductAttributeValue row(s) reference it; refusing to delete`);
      blocked += 1;
      continue;
    }
    if (dryRun) {
      console.log(`  • dry-run id=${row.id} key="${row.key}" categoryId=${row.categoryId} — would delete`);
    } else {
      await prisma.categoryAttribute.delete({ where: { id: row.id } });
      console.log(`  ✅ deleted id=${row.id} key="${row.key}" categoryId=${row.categoryId}`);
      deleted += 1;
    }
  }
  console.log(`[repair] done: ${deleted} deleted, ${blocked} blocked${dryRun ? " (dry-run)" : ""}`);
  if (blocked > 0) process.exit(2);
} finally {
  await prisma.$disconnect();
}
